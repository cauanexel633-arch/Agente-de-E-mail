'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [user, setUser] = useState(null)
  const [agente, setAgente] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => setUser(data.user))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      fetch('/api/salvar-agente').then(r => r.json()).then(d => setAgente(d.agente))
    }
  }, [user])

  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` }
    })
  }

  const logout = async () => { await supabase.auth.signOut() }

  if (!user) {
    return (
      <div>
        <h1>agente-email-ia</h1>
        <p>Crie seu agente de envio de e-mails em 2 minutos.</p>
        <button onClick={login} style={{padding:'12px 20px', fontSize:16}}>Entrar com Google</button>
      </div>
    )
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between'}}>
        <h1>Olá, {user.email}</h1>
        <button onClick={logout}>Sair</button>
      </div>
      {agente ? (
        <div style={{marginTop:30}}>
          <h2>Seu agente está pronto</h2>
          <p>E-mail: {agente.email_remetente}</p>
          <a href="/agente"><button>Ver prompt da IA</button></a>
        </div>
      ) : (
        <div style={{marginTop:30}}>
          <h2>Comece agora</h2>
          <a href="/criar-agente"><button style={{padding:'12px 20px'}}>Criar agente e-mail.ia</button></a>
        </div>
      )}
    </div>
  )
}
