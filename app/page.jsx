'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  Mail, Sparkles, LogOut, Save, Key, Lock, Copy,
  CheckCircle2, AlertCircle, ExternalLink, X, ShieldCheck, Settings,
} from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function genCode() {
  return 'ag_' + Math.random().toString(36).slice(2, 10)
}

const GMAIL_STEPS = [
  'Acesse sua Conta Google',
  'Vá em Segurança',
  'Ative Verificação em 2 etapas',
  'Gere uma Senha de app',
]

export default function Home() {
  const [mounted, setMounted] = useState(false)
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [form, setForm] = useState({
    email_remetente: '',
    api_key: '',
    email_password: '',
    agent_code: '',
    resumo: '',
  })
  const [status, setStatus] = useState({ type: '', msg: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setMounted(true)
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await load(data.session.user.id)
      setCheckingSession(false)
    })
  }, [])

  // Toast desaparece sozinho depois de alguns segundos
  useEffect(() => {
    if (!status.msg) return
    const t = setTimeout(() => setStatus({ type: '', msg: '' }), 4000)
    return () => clearTimeout(t)
  }, [status.msg])

  async function load(id) {
    const { data } = await supabase.from('agentes').select('*').eq('user_id', id).maybeSingle()
    if (data) {
      setForm({
        email_remetente: data.email_remetente || '',
        api_key: data.api_key || '',
        email_password: '',
        agent_code: data.agent_code || '',
        resumo: data.resumo || '',
      })
    }
  }

  const login = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.email_remetente || !form.api_key) {
      setStatus({ type: 'error', msg: 'Preencha o e-mail e a API Key antes de salvar.' })
      return
    }
    setSaving(true)
    setStatus({ type: '', msg: '' })

    const { data: { user } } = await supabase.auth.getUser()
    const code = form.agent_code || genCode()
    const resumo = `Agente para ${form.email_remetente} - responde automaticamente via IA`

    const { error } = await supabase.from('agentes').upsert(
      {
        user_id: user.id,
        email_remetente: form.email_remetente,
        api_key: form.api_key,
        email_password_encrypted: form.email_password,
        agent_code: code,
        resumo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (!error) {
      setForm((f) => ({ ...f, agent_code: code, resumo }))
      setStatus({ type: 'success', msg: 'Configurações salvas com sucesso!' })
    } else {
      setStatus({ type: 'error', msg: error.message })
    }
    setSaving(false)
  }

  const removeAccount = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('agentes').delete().eq('user_id', user.id)
    if (!error) {
      setForm({ email_remetente: '', api_key: '', email_password: '', agent_code: '', resumo: '' })
      setStatus({ type: 'success', msg: 'Conta removida.' })
    } else {
      setStatus({ type: 'error', msg: error.message })
    }
  }

  const copy = (t) => {
    navigator.clipboard.writeText(t)
    setStatus({ type: 'success', msg: 'Copiado para a área de transferência!' })
  }

  const buildAgentPrompt = () => {
    const url =
      typeof window !== 'undefined' && form.agent_code
        ? `${window.location.origin}/api/agent/${form.agent_code}`
        : `https://SEU-DOMINIO.com/api/agent/${form.agent_code}`

    return `Você é meu assistente de e-mails. Você NUNCA envia sem minha aprovação.

Para enviar um e-mail, você deve chamar esta API:

POST ${url}

Headers:
Content-Type: application/json
x-api-key: ${form.api_key || 'SUA_API_KEY_HUGGING_FACE'}

Body:
{
  "para": "email_do_destinatario",
  "assunto": "assunto do e-mail",
  "corpo": "corpo do e-mail"
}

REGRAS:
1. Sempre me mostre o e-mail completo antes e pergunte "Posso enviar?"
2. Só chame a API se eu responder exatamente "enviar", "sim" ou "pode enviar"
3. Nunca invente destinatário`
  }

  if (checkingSession) {
    return (
      <div className="h-screen grid place-items-center bg-[#070a14]">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Sparkles className="animate-pulse text-violet-400" size={18} />
          Carregando...
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="h-screen grid place-items-center bg-[#070a14]">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-white">
            <Sparkles className="text-violet-400" size={26} />
            agente.email
          </div>
          <button
            onClick={login}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:opacity-90 transition"
          >
            Entrar com Google
          </button>
        </div>
      </div>
    )
  }

  const endpoint =
    mounted && form.agent_code ? `${window.location.origin}/api/agent/${form.agent_code}` : ''

  return (
    <div className="min-h-screen bg-[#070a14] text-white flex">
      {/* Toast */}
      {status.msg && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm shadow-lg backdrop-blur
          ${status.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}
        >
          {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {status.msg}
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 shrink-0 flex-col justify-between border-r border-white/5 bg-[#0a0d18] p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2 py-1 font-semibold text-white">
            <Sparkles className="text-violet-400" size={20} />
            agente.email
          </div>

          <nav className="space-y-1">
            <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-600/15 border border-violet-500/30 text-violet-300 text-sm font-medium">
              <Settings size={16} />
              Configuração
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm hover:bg-white/5 transition"
            >
              <LogOut size={16} />
              Sair
            </button>
          </nav>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <p className="text-sm font-semibold text-white">Precisa de ajuda?</p>
          <p className="text-xs leading-relaxed text-slate-400">
            Siga os passos ao lado para configurar sua conta e começar a automação com IA.
          </p>
          <a
            href="https://huggingface.co/settings/tokens"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-600/10 px-3 py-2 text-xs font-medium text-violet-300 hover:bg-violet-600/20 transition"
          >
            <ExternalLink size={13} />
            Ver guia rápido
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 text-violet-400 mb-3">
          <Sparkles size={18} />
          <div className="h-px w-10 bg-gradient-to-r from-violet-500 to-transparent" />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Painel de Configuração</h1>
            <p className="text-slate-400 mt-1">Configure sua conta de envio e conecte as chaves necessárias.</p>
          </div>
          <button
            onClick={logout}
            className="md:hidden flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Coluna esquerda */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-bold text-white">Configuração</h2>
              <p className="text-sm text-slate-400 mb-5">Configure sua conta de envio.</p>

              <form onSubmit={save} className="space-y-4">
                <Field icon={<Mail size={16} />} label="E-mail remetente">
                  <input
                    type="email"
                    placeholder="seuemail@gmail.com"
                    value={form.email_remetente}
                    onChange={(e) => setForm({ ...form, email_remetente: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition"
                  />
                </Field>

                <Field icon={<Key size={16} />} label="API Key (Hugging Face)">
                  <input
                    placeholder="hf_..."
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition font-mono"
                  />
                </Field>

                <Field icon={<Lock size={16} />} label="Senha de aplicativo (Gmail)">
                  <input
                    type="password"
                    placeholder="Senha de aplicativo"
                    value={form.email_password}
                    onChange={(e) => setForm({ ...form, email_password: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 font-medium text-white hover:opacity-90 transition disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </form>
            </div>

            {form.email_remetente && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
                <h3 className="font-semibold text-white mb-1">Contas Salvas</h3>
                <p className="text-sm text-slate-400 mb-4">E-mails remetentes configurados</p>

                <div className="flex items-center justify-between rounded-xl border border-emerald-500/15 bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-red-400" />
                    <span className="text-sm text-slate-200">{form.email_remetente}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                      Ativo
                    </span>
                  </div>
                  <button
                    onClick={removeAccount}
                    className="h-7 w-7 grid place-items-center rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    title="Remover conta"
                  >
                    <X size={14} />
                  </button>
                </div>

                {form.agent_code && (
                  <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                    <KeyRow label="Código único" value={form.agent_code} onCopy={copy} mono />
                    <KeyRow label="Endpoint exclusivo" value={endpoint} onCopy={copy} mono small />
                  </div>
                )}
              </div>
            )}

            {form.agent_code && (
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.04] p-6">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="font-semibold text-white">Prompt para sua IA</h3>
                  <button
                    onClick={() => copy(buildAgentPrompt())}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-600/25 transition shrink-0"
                  >
                    <Copy size={13} />
                    Copiar prompt
                  </button>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Cole este texto nas instruções do seu assistente (ChatGPT, Claude, etc.) para
                  ele saber como enviar e-mails através do seu agente.
                </p>
                <pre className="p-4 rounded-xl bg-black/40 border border-white/5 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {buildAgentPrompt()}
                </pre>
              </div>
            )}
          </div>

          {/* Coluna direita */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="flex items-center gap-2 font-bold text-white mb-5">
                <Sparkles size={16} className="text-violet-400" />
                Como pegar as chaves
              </h3>

              <div className="space-y-5">
                <StepBlock number="1" title="Hugging Face">
                  <p className="text-sm text-slate-400">
                    Crie um Token com permissão Read e copie a chave iniciada em{' '}
                    <code className="text-violet-300">hf_</code>.
                  </p>
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-300 hover:bg-violet-600/25 transition"
                  >
                    <ExternalLink size={13} />
                    Abrir página
                  </a>
                </StepBlock>

                <div className="border-t border-white/5" />

                <StepBlock number="2" title="Gmail">
                  <p className="text-sm text-slate-400 mb-3">
                    Ative a verificação em duas etapas e gere uma senha de aplicativo.
                  </p>
                  <ol className="rounded-xl border border-white/10 bg-black/20 divide-y divide-white/5">
                    {GMAIL_STEPS.map((s, i) => (
                      <li key={s} className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300">
                        <span className="h-5 w-5 shrink-0 grid place-items-center rounded-md bg-white/5 text-xs text-slate-400">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </StepBlock>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex gap-3">
              <div className="h-9 w-9 shrink-0 grid place-items-center rounded-lg bg-white/5 text-slate-300">
                <ShieldCheck size={16} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Dica de segurança</p>
                <p className="text-sm text-slate-400 mt-0.5">
                  Nunca compartilhe suas chaves. Elas são confidenciais.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function Field({ icon, label, children }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm text-slate-400 mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  )
}

function StepBlock({ number, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="h-7 w-7 shrink-0 grid place-items-center rounded-lg bg-violet-600 text-white text-sm font-semibold">
        {number}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-white text-sm mb-1">{title}</p>
        {children}
      </div>
    </div>
  )
}

function KeyRow({ label, value, onCopy, mono, small }) {
  if (!value) return null
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <code
          className={`flex-1 truncate px-2 py-1.5 rounded-lg bg-black/40 border border-white/5 text-violet-300 ${
            small ? 'text-xs' : 'text-sm'
          } ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </code>
        <button
          onClick={() => onCopy(value)}
          className="h-7 w-7 shrink-0 grid place-items-center rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
          title="Copiar"
        >
          <Copy size={13} />
        </button>
      </div>
    </div>
  )
}