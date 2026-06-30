# agente-email-ia

Projeto completo do SaaS que você pediu. Usuário faz login com Google, cria seu agente de e-mail, e recebe um prompt personalizado para colar em qualquer IA.

## Stack
- Next.js 14 (App Router)
- Supabase (Auth + Banco)
- Nodemailer + Gmail (senha de app)
- Deploy pronto para Render ou Vercel

## 1. Configurar Supabase
1. Crie um projeto em supabase.com
2. Vá em SQL Editor e rode:

```sql
create table agentes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null unique,
  email_remetente text not null,
  api_key text not null,
  email_password_encrypted text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table agentes enable row level security;

create policy "usuário vê só o seu"
on agentes for select using (auth.uid() = user_id);

create policy "usuário insere o seu"
on agentes for insert with check (auth.uid() = user_id);

create policy "usuário atualiza o seu"
on agentes for update using (auth.uid() = user_id);
```

3. Authentication > Providers > ative Google
4. Pegue as chaves em Settings > API

## 2. Configurar Gmail
1. Ative verificação em duas etapas na sua conta Google
2. Crie uma Senha de App: myaccount.google.com > Segurança > Senhas de app > Gerar (16 caracteres)

## 3. Rodar local
```bash
git clone ...
cd agente-email-ia
npm install
cp .env.local.example .env.local
# preencha as variáveis
npm run dev
```
Acesse http://localhost:3000

## 4. Fluxo
- Login Google
- Criar agente (preencha e-mail, a api key é gerada, cole a senha de app)
- Página /agente mostra o prompt pronto
- Cole esse prompt em Claude, ChatGPT, etc.
- Quando disser "enviar", a IA chama POST /api/enviar-email

## 5. Deploy no Render
- New Web Service > conecte GitHub
- Build Command: npm install && npm run build
- Start Command: npm start
- Adicione as mesmas variáveis de ambiente do .env.local
