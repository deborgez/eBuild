# ObraGest — Sistema SaaS de Gestão de Obras Civis

Sistema web completo para gestão e administração de obras civis, com foco em fluxo financeiro, aprovação de orçamentos via link mágico e cálculo automático da taxa de administração.

---

## ✅ Funcionalidades do MVP

- **Dashboard de obras** — Listagem, progresso e resumo financeiro de todas as obras
- **Gestão de etapas** — Cronograma físico-financeiro com controle de percentual de conclusão
- **Lançamentos** — Registro de materiais e mão de obra por etapa
- **Link Mágico** — Geração de link único criptografado (JWT) enviado ao cliente para aprovação
- **Página do cliente** — Interface mobile-first para o cliente aprovar ou reprovar orçamentos
- **Log de aprovações** — Registro com IP, data, hora e user-agent para respaldo jurídico
- **Motor financeiro** — Cálculo automático da taxa de administração (16%) ao concluir etapas
- **Equalização final** — Cálculo de bônus ou desconto baseado no custo real vs referência por m²
- **Upload de comprovantes** — Armazenamento de NFs e cotações no Supabase Storage
- **Isolamento de documentação** — Etapa de taxas/projetos isolada do custo global e da comissão

---

## 🛠 Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js 14 (App Router) + TypeScript |
| Estilização | Tailwind CSS |
| Back-end | Next.js API Routes |
| ORM | Prisma |
| Banco de dados | PostgreSQL (Supabase) |
| Autenticação | NextAuth.js (credentials) |
| Armazenamento | Supabase Storage |
| Deploy | Vercel |

---

## 🚀 Configuração passo a passo (sem linha de código!)

### Passo 1 — Criar conta no Supabase (banco de dados + storage)

1. Acesse [supabase.com](https://supabase.com) e clique em **Start your project**
2. Crie uma conta gratuita (pode usar o Google)
3. Clique em **New Project** e preencha:
   - **Name:** `obra-saas`
   - **Database Password:** anote essa senha, você vai precisar
   - **Region:** `South America (São Paulo)`
4. Aguarde ~2 minutos enquanto o projeto é criado

**Obtendo as URLs do banco:**
1. No painel do Supabase, vá em **Settings → Database**
2. Role até **Connection string**
3. Selecione **URI** e copie a string (substitua `[YOUR-PASSWORD]` pela senha criada)
4. Você vai precisar de duas URLs:
   - **DATABASE_URL** → use a string com `?pgbouncer=true&connection_limit=1` (porta 6543)
   - **DIRECT_URL** → mesma string mas porta 5432, sem os parâmetros extras

**Criando o bucket de storage:**
1. No Supabase, vá em **Storage → New bucket**
2. Nome: `comprovantes`
3. Marque **Public bucket** (para que os links dos comprovantes sejam acessíveis)
4. Clique em **Save**

**Obtendo as chaves da API:**
1. Vá em **Settings → API**
2. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` *(mantenha este em segredo!)*

---

### Passo 2 — Criar conta no Vercel (deploy)

1. Acesse [vercel.com](https://vercel.com) e crie uma conta gratuita (pode usar o GitHub)
2. Instale o [GitHub Desktop](https://desktop.github.com/) se ainda não tiver
3. Crie um repositório no GitHub com o conteúdo desta pasta

---

### Passo 3 — Configurar as variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local` e preencha:

```bash
# Banco de dados (do painel Supabase > Settings > Database)
DATABASE_URL="postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

# Supabase Storage (do painel Supabase > Settings > API)
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Secrets — gere rodando no terminal: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXTAUTH_SECRET="cole-aqui-uma-string-aleatoria-longa"
MAGIC_LINK_SECRET="cole-aqui-outra-string-aleatoria-diferente"

# URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

> **Como gerar os secrets:** Abra o terminal e rode:
> ```
> node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
> ```
> Rode duas vezes e use uma string diferente para cada secret.

---

### Passo 4 — Instalar dependências e criar o banco

Abra o terminal na pasta do projeto e rode em sequência:

```bash
# 1. Instalar dependências
npm install

# 2. Criar as tabelas no banco de dados
npm run db:push

# 3. Criar dados de demonstração (admin + obra de exemplo)
npm run db:seed

# 4. Rodar o sistema localmente
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

**Login inicial:**
- E-mail: `admin@construtora.com`
- Senha: `admin123`

> ⚠️ **Troque a senha** depois do primeiro acesso em produção.

---

### Passo 5 — Deploy no Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Conecte seu repositório GitHub com o projeto
3. Na tela de configuração, vá em **Environment Variables** e adicione **todas** as variáveis do `.env.local`
4. Para produção, mude:
   - `NEXTAUTH_URL` → URL do seu domínio no Vercel (ex: `https://obra-saas.vercel.app`)
   - `NEXT_PUBLIC_BASE_URL` → mesma URL
5. Clique em **Deploy**
6. Após o deploy, rode as migrations: no painel do Vercel vá em **Functions → Run** ou rode localmente apontando para o banco de produção:
   ```bash
   DATABASE_URL="sua-url-producao" npm run db:push
   DATABASE_URL="sua-url-producao" npm run db:seed
   ```

---

## 📁 Estrutura do projeto

```
obra-saas/
├── prisma/
│   ├── schema.prisma          # Modelo do banco de dados
│   └── seed.ts                # Dados iniciais de demonstração
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Página de login
│   │   ├── (dashboard)/       # Área administrativa (protegida)
│   │   │   ├── obras/         # Listagem e detalhe de obras
│   │   │   ├── lancamentos/   # Registro de serviços/materiais
│   │   │   └── clientes/      # Gestão de clientes
│   │   ├── aprovacao/[token]/ # Página do cliente (Link Mágico)
│   │   └── api/               # Endpoints da API REST
│   ├── components/
│   │   └── dashboard/         # Componentes do painel
│   └── lib/
│       ├── prisma.ts          # Cliente do banco
│       ├── auth.ts            # Configuração NextAuth
│       ├── magic-link.ts      # Geração e validação de tokens JWT
│       ├── financeiro.ts      # Motor financeiro (taxa + equalização)
│       └── supabase.ts        # Cliente Supabase Storage
```

---

## 💡 Como usar o sistema

### Fluxo completo de um lançamento

1. **Criar obra** → `/obras/nova` — preencha os dados, taxa e área
2. **Criar cliente** → `/clientes` — nome, e-mail e WhatsApp
3. **Registrar lançamento** → na obra, clique em **+ Lançamento** — selecione a etapa, tipo e valor
4. **Gerar link mágico** → na etapa, clique em **📲 Gerar link** — copie e envie via WhatsApp
5. **Cliente aprova** → o cliente abre o link no celular e clica em Aprovar
6. **Marcar pago** → após pagar o fornecedor, clique em **✓ Marcar pago**
7. **Concluir etapa** → ajuste o slider para 100% → taxa de 16% é calculada automaticamente
8. **Encerrar obra** → botão no topo da obra → equalização final é calculada

### Regras de negócio automáticas

| Evento | O que acontece automaticamente |
|---|---|
| Etapa chega a 100% | Soma lançamentos pagos/aprovados e gera fatura de 16% |
| Obra encerrada | Calcula custo real/m², compara com referência, gera desconto ou bônus |
| Lançamento na etapa "Documentação" | Automaticamente excluído do custo global e da base de comissão |
| Cliente clica em Aprovar/Reprovar | Grava log com IP, data, hora e user-agent |
| Token usado ou expirado | Link é invalidado, novo link deve ser gerado |

---

## 🔒 Segurança do Link Mágico

- Token JWT assinado com HS256 usando `MAGIC_LINK_SECRET`
- Validade de 72 horas
- **One-time-use:** após o cliente clicar (aprovar ou reprovar), o token é invalidado no banco
- Payload contém apenas o ID do lançamento e um UUID único (`jti`) — nenhum dado sensível
- Todas as ações do cliente são registradas na tabela `aprovacoes`

---

## 🔧 Próximas funcionalidades (pós-MVP)

- [ ] Integração WhatsApp via Z-API ou Twilio para envio automático do link
- [ ] Integração e-mail via Resend para envio automático
- [ ] Relatórios financeiros em PDF
- [ ] Dashboard de indicadores com gráficos (Recharts)
- [ ] Múltiplos usuários por construtora com permissões
- [ ] Notificações em tempo real (Supabase Realtime)
- [ ] Exportação do cronograma para Excel
- [ ] Histórico completo de aprovações por obra (auditoria)

---

## 🆘 Problemas comuns

**"Prisma Client did not initialize"**
→ Rode `npm run db:generate` e reinicie o servidor.

**"PrismaClientKnownRequestError: Table does not exist"**
→ Rode `npm run db:push` para criar as tabelas.

**"Invalid token"** na página de aprovação
→ O token expirou (72h) ou já foi utilizado. Gere um novo link no painel.

**Upload não funciona**
→ Verifique se o bucket `comprovantes` foi criado como **Public** no Supabase Storage.

**Login não funciona em produção**
→ Certifique-se de que `NEXTAUTH_URL` aponta para o domínio correto do Vercel.
