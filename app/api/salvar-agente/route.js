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

export async function GET() {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ agente: null })
  
  const { data } = await supabase.from('agentes').select('*').eq('user_id', user.id).single()
  return NextResponse.json({ agente: data })
}

export async function POST(request) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const encrypted = CryptoJS.AES.encrypt(body.email_password, process.env.ENCRYPTION_KEY).toString()

  const { error } = await supabase.from('agentes').upsert({
    user_id: user.id,
    email_remetente: body.email_remetente,
    api_key: body.api_key,
    email_password_encrypted: encrypted,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
