'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function CriarAgente() {
  const [email, setEmail] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => { setApiKey(crypto.randomUUID()) }, [])

  const salvar = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('Faça login'); return }

    const res = await fetch('/api/salvar-agente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_remetente: email,
        api_key: apiKey,
        email_password: senha
      })
    })
    setLoading(false)
    if (res.ok) router.push('/agente')
    else alert('Erro ao salvar')
  }

  return (
    <div>
      <h1>Criar agente e-mail.ia</h1>
      <form onSubmit={salvar} style={{display:'grid', gap:16, marginTop:20}}>
        <label>
          seu e-mail
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{width:'100%', padding:8}} />
        </label>
        <label>
          sua chave api
          <input value={apiKey} readOnly style={{width:'100%', padding:8, background:'#f0f0f0'}} />
        </label>
        <label>
          sua Email PASSWORD (senha de app do Gmail)
          <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} required style={{width:'100%', padding:8}} placeholder="abcd efgh ijkl mnop" />
        </label>
        <button type="submit" disabled={loading} style={{padding:12}}>
          {loading ? 'Salvando...' : 'Criar agente'}
        </button>
      </form>
    </div>
  )
}
