import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'
import CryptoJS from 'crypto-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey) return NextResponse.json({ error: 'API key ausente' }, { status: 401 })

  const { para, assunto, corpo, id_usuario } = await request.json()
  if (!para || !assunto || !corpo || !id_usuario) {
    return NextResponse.json({ error: 'Campos obrigatórios' }, { status: 400 })
  }

  const { data: agente } = await supabaseAdmin
    .from('agentes')
    .select('*')
    .eq('user_id', id_usuario)
    .eq('api_key', apiKey)
    .single()

  if (!agente) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 403 })

  const senha = CryptoJS.AES.decrypt(agente.email_password_encrypted, process.env.ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8)

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: agente.email_remetente, pass: senha }
  })

  await transporter.sendMail({
    from: agente.email_remetente,
    to: para,
    subject: assunto,
    text: corpo,
    html: corpo.replace(/\n/g, '<br>')
  })

  return NextResponse.json({ sucesso: true, enviado_para: para })
}
