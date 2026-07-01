import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import CryptoJS from 'crypto-js'

function getSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )
}

function genCode() {
  return 'ag_' + Math.random().toString(36).slice(2, 10)
}

function genSecret() {
  return Math.random().toString(36).slice(2, 10)
}

export async function GET() {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ agente: null })

  const { data } = await supabase.from('agentes').select('*').eq('user_id', user.id).maybeSingle()
  // Nunca devolve a senha (nem criptografada) pro cliente.
  if (data) delete data.email_password_encrypted
  return NextResponse.json({ agente: data })
}

export async function POST(request) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { email_remetente, api_key, email_password } = body || {}

  if (!email_remetente || !api_key) {
    return NextResponse.json({ error: 'E-mail remetente e API Key são obrigatórios' }, { status: 400 })
  }

  // Busca o registro existente (se houver) pra manter código/segredo/senha já salvos.
  const { data: existente } = await supabase
    .from('agentes')
    .select('agent_code, agent_secret, email_password_encrypted')
    .eq('user_id', user.id)
    .maybeSingle()

  const agent_code = existente?.agent_code || genCode()
  const agent_secret = existente?.agent_secret || genSecret()

  // Só recriptografa a senha se o usuário digitou uma nova. Se deixou em
  // branco, mantém a que já estava salva (senão apagaria a senha ao salvar
  // apenas e-mail/API key de novo).
  let email_password_encrypted = existente?.email_password_encrypted || null
  if (email_password) {
    email_password_encrypted = CryptoJS.AES.encrypt(
      email_password,
      process.env.ENCRYPTION_KEY
    ).toString()
  }

  const resumo = `Agente para ${email_remetente} - responde automaticamente via IA`

  const { data: salvo, error } = await supabase
    .from('agentes')
    .upsert(
      {
        user_id: user.id,
        email_remetente,
        api_key,
        email_password_encrypted,
        agent_code,
        agent_secret,
        resumo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('agent_code, agent_secret, resumo')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, ...salvo })
}