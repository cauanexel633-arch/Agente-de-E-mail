export const metadata = {
  title: "agente-email-ia",
  description: "Crie seu agente de e-mail com IA"
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{fontFamily:'system-ui, -apple-system, Segoe UI', margin:0, padding:'2rem', background:'#f7f7f8', color:'#111'}}>
        <div style={{maxWidth:800, margin:'0 auto', background:'white', padding:'2rem', borderRadius:12, boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
          {children}
        </div>
      </body>
    </html>
  );
}
