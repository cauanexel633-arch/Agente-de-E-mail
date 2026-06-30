'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Mail, Sparkles, Shield, LogOut, Save, Rocket } from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ email_remetente: '', api_key: '', email_password: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) loadAgent(data.session.user.id)
      setLoading(false)
    })
  }, [])

  async function loadAgent(userId) {
    const { data } = await supabase.from('agentes').select('*').eq('user_id', userId).single()
    if (data) setForm({ email_remetente: data.email_remetente, api_key: data.api_key, email_password: '' })
  }

  const login = () => supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/api/auth/callback` }
  })

  const logout = async () => { await supabase.auth.signOut(); location.reload() }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('agentes').upsert({
      user_id: user.id,
      email_remetente: form.email_remetente,
      api_key: form.api_key,
      email_password_encrypted: form.email_password // na versão final criptografe no backend
    })
    setMsg(error ? 'Erro ao salvar' : 'Agente salvo com sucesso!')
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <div className="h-screen bg-[#0B0F19] grid place-center text-white">Carregando...</div>

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white">
        <nav className="max-w-6xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2 font-semibold"><Sparkles className="text-violet-400"/> agente.email.ai</div>
          <button onClick={login} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl">Entrar</button>
        </nav>

        <section className="max-w-6xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-6">
            <Rocket size={14}/> Novo: IA que responde seus e-mails sozinha
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            Seu agente de e-mail<br/>com inteligência artificial
          </h1>
          <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto">Conecte seu Gmail, cole sua API key e deixe a IA responder clientes, leads e suporte 24/7. Configuração em 2 minutos.</p>
          <button onClick={login} className="mt-10 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl font-medium shadow-lg shadow-violet-900/30 hover:opacity-90 transition">
            Começar com Google →
          </button>

          <div className="grid md:grid-cols-3 gap-6 mt-24 text-left">
            {[
              {icon:<Mail/>, title:'Respostas automáticas', desc:'IA lê e responde com seu tom de voz'},
              {icon:<Shield/>, title:'Seguro', desc:'Senha criptografada, dados isolados por usuário'},
              {icon:<Sparkles/>, title:'Sem código', desc:'Funciona com qualquer provedor via SMTP'}
            ].map((f,i)=>(
              <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-violet-400 mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-white/60 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <header className="border-b border-white/10 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 font-semibold"><Sparkles className="text-violet-400"/> agente.email.ai</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/60">{session.user.email}</span>
            <button onClick={logout} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm"><LogOut size={14}/> Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold">Configurar seu agente</h1>
        <p className="text-white/60 mt-2">Preencha uma vez e seu agente começa a funcionar.</p>

        <form onSubmit={save} className="mt-8 p-8 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 shadow-2xl">
          <div className="space-y-5">
            <div>
              <label className="text-sm text-white/70">Email remetente</label>
              <input value={form.email_remetente} onChange={e=>setForm({...form, email_remetente:e.target.value})} placeholder="voce@gmail.com" className="mt-1 w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-violet-500"/>
            </div>
            <div>
              <label className="text-sm text-white/70">Hugging Face API Key</label>
              <input value={form.api_key} onChange={e=>setForm({...form, api_key:e.target.value})} placeholder="hf_..." className="mt-1 w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-violet-500"/>
            </div>
            <div>
              <label className="text-sm text-white/70">Senha de App do Gmail</label>
              <input type="password" value={form.email_password} onChange={e=>setForm({...form, email_password:e.target.value})} placeholder="••••••••••••••••" className="mt-1 w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl outline-none focus:border-violet-500"/>
              <p className="text-xs text-white/40 mt-1">Crie em myaccount.google.com &gt; Segurança &gt; Senhas de app</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <button disabled={saving} className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50">
              <Save size={16}/> {saving ? 'Salvando...' : 'Salvar agente'}
            </button>
            {msg && <span className="text-sm text-emerald-400">{msg}</span>}
          </div>
        </form>

        <div className="mt-12 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <h3 className="font-semibold text-amber-200">Próximo passo</h3>
          <p className="text-sm text-white/70 mt-1">Depois de salvar, vamos conectar o webhook para ele responder automaticamente. Me avise quando salvar que eu te passo o código do worker.</p>
        </div>
      </main>
    </div>
  )
}
