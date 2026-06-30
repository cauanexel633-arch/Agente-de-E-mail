'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function AgentePage() {
  const [agente, setAgente] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => setUser(data.user))
    fetch('/api/salvar-agente').then(r => r.json()).then(d => setAgente(d.agente))
  }, [])

  if (!agente || !user) return <p>Carregando...</p>

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://SEU-DOMINIO'
  const prompt = `Você é meu assistente de e-mails. Você NUNCA envia sem minha aprovação.

Para enviar um e-mail, você deve chamar esta API:

POST ${site}/api/enviar-email
Headers:
  Content-Type: application/json
  x-api-key: ${agente.api_key}

Body:
{
  "para": "email_do_destinatario",
  "assunto": "assunto do e-mail",
  "corpo": "corpo do e-mail",
  "id_usuario": "${user.id}"
}

REGRAS:
1. Sempre me mostre o e-mail completo antes e pergunte "Posso enviar?"
2. Só chame a API se eu responder exatamente "enviar", "sim" ou "pode enviar"
3. Nunca invente destinatário`

  return (
    <div>
      <h1>Seu agente está pronto</h1>
      <p><strong>Remetente:</strong> {agente.email_remetente}</p>
      <p><strong>API Key:</strong> {agente.api_key}</p>
      <h3>Prompt para colar em qualquer IA:</h3>
      <textarea readOnly value={prompt} style={{width:'100%', height:320, fontFamily:'monospace', padding:12}} />
      <button onClick={() => navigator.clipboard.writeText(prompt)} style={{marginTop:12, padding:'10px 16px'}}>Copiar prompt</button>
    </div>
  )
}
