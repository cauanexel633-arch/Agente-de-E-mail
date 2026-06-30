import './globals.css'

export const metadata = {
  title: 'agente.email — Painel de Configuração',
  description: 'Configure sua conta de envio e conecte as chaves do seu agente de e-mail com IA.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#070a14] text-slate-200 antialiased selection:bg-violet-500/30">
        {children}
      </body>
    </html>
  )
}