import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import CryptoJS from 'crypto-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Lógica central de envio, compartilhada entre GET (link-gatilho) e POST (padrão via API).
async function enviarEmail({ code, key, para, assunto, corpo }) {
  if (!code) {
    return NextResponse.json({ error: 'Código do agente ausente na URL' }, { status: 400 })
  }
  if (!key) {
    return NextResponse.json({ error: 'Chave (key) ausente' }, { status: 401 })
  }
  if (!para || !assunto || !corpo) {
    return NextResponse.json(
      { error: 'Campos obrigatórios ausentes: para, assunto, corpo' },
      { status: 400 }
    )
  }

  // Bug corrigido: antes não havia validação nenhuma do destinatário.
  const destinatario = String(para).trim()
  if (!EMAIL_REGEX.test(destinatario)) {
    return NextResponse.json({ error: 'E-mail do destinatário inválido' }, { status: 400 })
  }

  // Busca o agente pelo código único da URL + a chave curta do gatilho (agent_secret).
  // Não usa mais o id_usuario interno nem a chave longa da Hugging Face pra autenticar isso.
  const { data: agente, error: findError } = await supabaseAdmin
    .from('agentes')
    .select('*')
    .eq('agent_code', code)
    .eq('agent_secret', key)
    .single()

  if (findError || !agente) {
    return NextResponse.json({ error: 'Agente não encontrado ou chave inválida' }, { status: 403 })
  }

  if (!agente.email_remetente || !agente.email_password_encrypted) {
    return NextResponse.json({ error: 'Conta de envio ainda não configurada' }, { status: 422 })
  }

  let senha
  try {
    senha = CryptoJS.AES.decrypt(
      agente.email_password_encrypted,
      process.env.ENCRYPTION_KEY
    ).toString(CryptoJS.enc.Utf8)
    if (!senha) throw new Error('senha vazia após decriptação')
  } catch {
    return NextResponse.json(
      { error: 'Falha ao descriptografar a senha de aplicativo. Salve a senha novamente no painel.' },
      { status: 500 }
    )
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: agente.email_remetente, pass: senha },
  })

  try {
    await transporter.sendMail({
      from: agente.email_remetente,
      to: destinatario,
      subject: assunto,
      text: corpo,
      html: String(corpo).replace(/\n/g, '<br>'),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Falha ao enviar e-mail', detalhe: err.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ sucesso: true, enviado_para: destinatario })
}

// Uso recomendado: chamada padrão via API, com JSON no corpo e chave no header.
// POST /api/agent/ag_xxxx
// Headers: x-api-key: <agent_secret>
// Body: { "para": "...", "assunto": "...", "corpo": "..." }
export async function POST(request, { params }) {
  const { code } = params
  const key = request.headers.get('x-api-key')

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido (JSON esperado)' }, { status: 400 })
  }

  return enviarEmail({ code, key, para: body?.para, assunto: body?.assunto, corpo: body?.corpo })
}

// Uso "link-gatilho": só de acessar essa URL (GET) o e-mail já é enviado.
// GET /api/agent/ag_xxxx?key=xxxx&para=...&assunto=...&corpo=...
// IMPORTANTE: como é um GET, qualquer sistema que "pré-visite" o link
// (WhatsApp, Slack, Telegram, scanners de e-mail) pode disparar o envio sem
// que ninguém tenha clicado de verdade. Use com cuidado e nunca cole esse
// link em lugares onde ele possa ser aberto automaticamente por terceiros.
export async function GET(request, { params }) {
  const { code } = params
  const { searchParams } = new URL(request.url)

  return enviarEmail({
    code,
    key: searchParams.get('key'),
    para: searchParams.get('para'),
    assunto: searchParams.get('assunto'),
    corpo: searchParams.get('corpo'),
  })
}