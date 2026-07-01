import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import CryptoJS from 'crypto-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request, { params }) {
  const { code } = params
  if (!code) {
    return NextResponse.json({ error: 'Código do agente ausente na URL' }, { status: 400 })
  }

  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) {
    return NextResponse.json({ error: 'Header x-api-key ausente' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido (JSON esperado)' }, { status: 400 })
  }

  const { para, assunto, corpo } = body || {}
  if (!para || !assunto || !corpo) {
    return NextResponse.json(
      { error: 'Campos obrigatórios ausentes: para, assunto, corpo' },
      { status: 400 }
    )
  }

  // Bug corrigido: antes não havia validação nenhuma do destinatário.
  // Um "para" vazio, mal formatado ou com espaços passava direto pro nodemailer.
  const destinatario = String(para).trim()
  if (!EMAIL_REGEX.test(destinatario)) {
    return NextResponse.json({ error: 'E-mail do destinatário inválido' }, { status: 400 })
  }

  // Busca o agente pelo código único da URL, não mais pelo id_usuario interno.
  const { data: agente, error: findError } = await supabaseAdmin
    .from('agentes')
    .select('*')
    .eq('agent_code', code)
    .eq('api_key', apiKey)
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
      html: corpo.replace(/\n/g, '<br>'),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Falha ao enviar e-mail', detalhe: err.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ sucesso: true, enviado_para: destinatario })
}