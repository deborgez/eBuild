# ObraGest — Guia Completo para Desenvolvimento no Claude Code

## Visão Geral

SaaS de gestão de obras civis para construtoras. Permite gerenciar obras, etapas, lançamentos financeiros, aprovações de clientes via link mágico, contratos globais, taxa de administração automática e relatórios.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS + CSS Variables |
| ORM | Prisma |
| Banco | PostgreSQL (local: `obradb`, porta 5432) |
| Storage | Supabase Storage (bucket: `comprovantes`) |
| Auth | NextAuth.js (Credentials) |
| Deploy | Vercel |

**Projeto em:** `C:\Projetos\obra-saas`  
**Banco local:** `obradb`  
**Login padrão:** `admin@construtora.com` / `admin123`

---

## Estrutura de Pastas

```
obra-saas/
├── prisma/
│   ├── schema.prisma          # Schema atual (v10)
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Rotas autenticadas
│   │   │   ├── page.tsx       # Redireciona para /dashboard
│   │   │   ├── layout.tsx     # Layout com Sidebar
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx   # Dashboard com métricas
│   │   │   ├── obras/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nova/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── relatorio/page.tsx
│   │   │   │       └── recibo/[faturaId]/page.tsx
│   │   │   ├── clientes/
│   │   │   │   └── page.tsx
│   │   │   ├── lancamentos/
│   │   │   │   ├── page.tsx         # Lista (sem menu lateral)
│   │   │   │   ├── novo/page.tsx    # Lançamento normal
│   │   │   │   └── novo-doc/page.tsx # Documentação
│   │   │   └── perfil/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── obras/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── encerrar/route.ts
│   │   │   │       ├── financeiro/route.ts
│   │   │   │       └── relatorio/route.ts
│   │   │   ├── etapas/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── lancamentos/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── [id]/notificar/route.ts
│   │   │   ├── contratos/
│   │   │   │   ├── route.ts          # Suporta multipart (upload arquivo)
│   │   │   │   └── [id]/route.ts
│   │   │   ├── orcamentos/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── clientes/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── faturas/[id]/route.ts
│   │   │   ├── perfil/
│   │   │   │   ├── route.ts
│   │   │   │   └── senha/route.ts
│   │   │   └── upload/route.ts
│   │   ├── aprovacao/[token]/page.tsx  # Página pública (cliente)
│   │   ├── login/page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── sidebar.tsx
│   │   │   ├── etapa-card.tsx
│   │   │   ├── financeiro-panel.tsx
│   │   │   ├── contratos-panel.tsx
│   │   │   ├── gerenciar-etapas-button.tsx
│   │   │   ├── encerrar-obra-button.tsx
│   │   │   ├── editar-obra-button.tsx
│   │   │   ├── novo-lancamento-modal.tsx  # Popup de novo lançamento
│   │   │   ├── anexar-foto-modal.tsx
│   │   │   └── prazo-indicador.tsx
│   │   ├── ui/
│   │   │   └── file-viewer.tsx            # Popup universal de arquivos
│   │   ├── providers.tsx
│   │   └── theme-provider.tsx
│   └── lib/
│       ├── prisma.ts
│       ├── auth.ts
│       ├── magic-link.ts
│       ├── supabase.ts
│       ├── utils.ts
│       └── financeiro.ts                  # Motor financeiro central
```

---

## Schema do Banco (Prisma v10)

```prisma
model Usuario {
  id       String  @id @default(uuid())
  nome     String
  email    String  @unique
  senha    String  // bcrypt
  role     Role    @default(CONSTRUTORA)
  telefone String?
  cnpj     String?
  empresa  String?
}

model Obra {
  id                    String
  clienteId             String
  nome                  String
  areaM2                Float
  prazoMeses            Int
  valorGlobalEstimado   Float
  custoBaseReferenciaM2 Float    @default(2100)
  valorVendaM2          Float?
  taxaAdministracaoPct  Float    @default(16)
  status                ObraStatus
  dataInicio            DateTime?
}

model Etapa {
  id                  String
  obraId              String
  nome                String
  ordem               Int
  percentualObra      Float    @default(0)   // % da obra que esta etapa representa
  percentualConclusao Float    @default(0)   // calculado automaticamente
  eDocumentacao       Boolean  @default(false)
  status              EtapaStatus
}

model ContratoGlobal {
  id         String
  obraId     String
  nome       String
  fornecedor String
  tipo       LancamentoTipo
  valorTotal Float          // entra no custo da obra imediatamente
  valorPago  Float          @default(0)
  arquivoUrl String?        // PDF/imagem do contrato
  status     ContratoStatus @default(ATIVO)
}

model Lancamento {
  id               String
  obraId           String
  etapaId          String?
  contratoGlobalId String?   // se preenchido: parcela de contrato (NÃO soma no custo)
  descricao        String
  tipo             LancamentoTipo
  valor            Float
  status           LancamentoStatus
  comprovanteUrl   String?
  fotoUrl          String?
  isGlobal         Boolean  @default(false)
  isBenfeitoria    Boolean  @default(false)  // valor à parte (não soma no custo), pode estar em qualquer etapa
  modoComparativo  Boolean  @default(false)
  magicToken       String?  @unique
}

model Orcamento {
  id           String
  lancamentoId String
  fornecedor   String
  valor        Float
  descricao    String?
  arquivoUrl   String?
  escolhido    Boolean @default(false)
}

model Aprovacao {
  id           String
  lancamentoId String
  orcamentoId  String?
  acao         AprovacaoAcao
  ipCliente    String?
  userAgent    String?
}

model FaturaAdmin {
  id               String
  obraId           String
  etapaId          String?
  baseCalculo      Float
  taxaPct          Float
  valorTaxa        Float
  equalizacaoValor Float?
  tipoEqualizacao  TipoEqualizacao?
  status           FaturaStatus @default(PENDENTE)
}
```

---

## Regras de Negócio Críticas

### Custo da obra
- Lançamentos avulsos nas etapas → **somam** no custo
- Contratos globais → somam pelo **valor total** (não pelo que foi pago)
- Parcelas de contrato (`contratoGlobalId != null`) → **NÃO somam** (já contabilizadas no contrato)
- Documentação (etapa `eDocumentacao = true`) → **isolada**, não entra em custo nem administração
- Benfeitorias (`Lancamento.isBenfeitoria = true`) → **valor à parte**, como a documentação, mas podem ser lançadas em **qualquer etapa normal** (não têm etapa própria). Melhorias/acréscimos que o cliente pede fora do projeto inicial. Não somam no custo da obra nem no progresso da etapa, mas **entram na base da taxa de administração** — a cobrança é única por etapa (custo normal + benfeitorias somados), não duas taxas separadas. A parcela da taxa proporcional às benfeitorias é calculada e reportada num **dashboard próprio de benfeitorias** (`getResumoFinanceiro(...).benfeitorias`), separado da administração da obra.
- Taxa de Administração → **separada**, não entra no custo de obra

### Administração da construtora
A **Administração da construtora** (antes chamada de "comissão") é o valor que a construtora recebe pela gestão da obra. O total é fixado pelo valor de venda por m², e é pago aos poucos: a cada etapa concluída, sua taxa de administração (% definido em `taxaAdministracaoPct`) é cobrada e, ao ser paga, abate do total da administração.
```
Administração total  = (valorVendaM2 - referenciaM2) × areaM2         // teto, definido na obra
Taxa por etapa        = custo da etapa × taxaAdministracaoPct%         // gerada quando lançamentos são aprovados/pagos
Já recebida           = soma das taxas de etapa com status PAGO
A receber (saldo)     = Administração total − já recebida
```
Sem `valorVendaM2` definido não há administração total calculável — a UI orienta a preencher esse campo na obra. `custoBaseReferenciaM2` também alimenta a **equalização** (bônus/desconto por eficiência de custo real vs. referência — ver abaixo), que é um ajuste final independente, aplicado no encerramento da obra.

### Taxa de Administração (automática)
- Gerada automaticamente quando qualquer lançamento da etapa é **APROVADO** ou **PAGO**
- Calculada sobre: soma dos lançamentos APROVADOS + PAGOS da etapa (excluindo a própria taxa)
- Se valor base aumenta → taxa é **atualizada** (desde que não tenha sido paga)
- Se lançamento é removido → taxa é **recalculada**
- Etapa só chega a **100%** quando: todos os lançamentos pagos + taxa paga

### Progresso da etapa
```
progressoObra = (totalPagoObra / totalValorObra) × 100
etapaConcluida = todosObraPagos && taxaGerada && taxaPaga
percentualConclusao = etapaConcluida ? 100 : min(progressoObra, 99)
```
O `percentualConclusao` é persistido no banco a cada pagamento via `PATCH /api/lancamentos/[id]`.

### Progresso geral da obra
```
progressoGeral = Σ (etapa.percentualObra × etapa.percentualConclusao / 100)
```
Requer que o usuário configure `percentualObra` em cada etapa (soma deve ser 100%).

### Link mágico (aprovação do cliente)
- Gerado em `POST /api/lancamentos/[id]/notificar`
- JWT HS256, 72h, uso único (token invalidado após uso)
- Página pública: `/aprovacao/[token]`
- Suporta modo simples (um orçamento) e comparativo (cliente escolhe entre N orçamentos)

---

## Funções do `financeiro.ts`

```typescript
// Recalcula taxa da etapa (chamada a cada mudança de status de lançamento)
recalcularTaxaEtapa(etapaId: string): Promise<void>

// Sincroniza status da FaturaAdmin com o lançamento de taxa real
sincronizarStatusFatura(etapaId: string): Promise<void>

// Calcula equalização ao encerrar a obra
calcularEqualizacaoFinal(obraId: string): Promise<{...}>

// Resumo financeiro completo da obra
getResumoFinanceiro(obraId: string): Promise<{
  custoObra, custoAvulso, custoContratos,
  custoTaxa, custoDocumentacao, custoMaterial, custoMaoDeObra,
  totalPago, totalPendente, totalAprovado,
  taxaAguardandoPagamento,
  custoRealM2, referenciaM2, valorVendaM2,
  administracaoTotal, taxaAdminGerada, taxaAdminPaga, administracaoRestante, // já excluem a parcela de benfeitorias
  diferencaM2, tendenciaEqualizacao, projecaoEqualizacao,
  progressoGeral,
  benfeitorias: { custoTotal, pago, pendente, aprovado, percentualPago, taxaAdminGerada, taxaAdminPaga },
  ...
}>
```

---

## Variáveis de Ambiente (.env)

```env
DATABASE_URL="postgresql://USER:PASS@localhost:5432/obradb?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASS@localhost:5432/obradb"
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
MAGIC_LINK_SECRET="..."
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

---

## Convenções de UI

### CSS Variables (dark/light mode)
```css
--color-bg           /* fundo geral */
--color-bg-card      /* cards */
--color-bg-header    /* cabeçalhos de card */
--color-border       /* bordas */
--color-text-primary
--color-text-muted
--color-brand        /* indigo */
--color-brand-light  /* indigo claro */
```

### Classes utilitárias
- `.card` — card com border e shadow
- `.btn-primary` — botão indigo
- `.btn-secondary` — botão outline
- `.input` — input estilizado
- `.label` — label do input
- `.badge` — pill colorido
- `.sidebar-link` — link do menu lateral
- `.stat-card` — card de métrica
- `.file-popup-overlay` / `.file-popup-container` — popup de arquivo

### Dark mode
- Aplicado via classe `html.dark`
- `globals.css` usa `!important` em `html` e `body` para garantir cobertura total
- `layout.tsx` aplica `backgroundColor: var(--color-bg)` no container e `<main>`

---

## Componentes Chave

### `EtapaCard`
- Exibe lançamentos de uma etapa
- Calcula progresso automaticamente (não usa slider)
- Mostra taxa de administração em tempo real
- Botões: 📲 Link mágico, ✓ Pago, ✏️ Editar, 🗑 Remover, 📷 Foto
- Todos os arquivos abrem via `FileViewer` (popup, nunca nova aba)
- Botão "+ Novo lançamento" abre `NovoLancamentoModal` (popup)

### `FileViewer`
- Props: `url`, `nome`, `children` (trigger)
- Detecta tipo: PDF → iframe, imagem → img, office → download, outro → download
- Nunca abre nova aba

### `NovoLancamentoModal`
- Popup inline para criar lançamento sem sair da página da obra
- Detecta se é etapa de documentação e adapta o formulário
- Suporta parcela de contrato global

### `ContratosPanel`
- Lista contratos globais com saldo em tempo real
- Upload de arquivo do contrato (multipart)
- Mostra parcelas lançadas por etapa

---

## Fluxos Principais

### 1. Criar obra
`/obras/nova` → cria Obra + Etapa 01 + Etapa Documentação automaticamente

### 2. Adicionar lançamento
Botão no rodapé do `EtapaCard` → `NovoLancamentoModal` → `POST /api/lancamentos` → recalcula taxa

### 3. Aprovação do cliente
Gerar link → `POST /api/lancamentos/[id]/notificar` → cliente acessa `/aprovacao/[token]` → escolhe orçamento → `POST /api/aprovacao/[token]` → lançamento vira APROVADO

### 4. Marcar como pago
Botão ✓ Pago → `PATCH /api/lancamentos/[id]` → recalcula taxa → atualiza `percentualConclusao` → sincroniza `FaturaAdmin`

### 5. Gerar relatório
`/obras/[id]/relatorio` → `GET /api/obras/[id]/relatorio` → página imprimível com filtro por etapa

---

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # build produção
npm run db:push      # aplicar schema no banco
npm run db:studio    # Prisma Studio (GUI do banco)
npx prisma generate  # gerar client após mudança no schema
```

---

## Pontos de Atenção para o Claude Code

1. **Enums do Prisma** — sempre em formato multi-linha (não compacto):
   ```prisma
   enum Status {
     PENDENTE
     ATIVO
   }
   ```
   Formato compacto `enum Status { PENDENTE ATIVO }` causa erro de validação.

2. **Progresso da etapa** — `percentualConclusao` deve ser persistido no banco via `atualizarProgressoEtapa(etapaId)` sempre que um lançamento mudar de status. Sem isso o progresso geral da obra não reflete o estado real.

3. **Bug de fatura (corrigido)** — `FaturaAdmin.status` pode ficar desatualizado se lido direto do banco. Todo endpoint/página que exibe o status (`/api/faturas/[id]`, dashboard, `/obras/[id]`) deve sempre ler o status real via `sincronizarStatusFatura()` ou buscando o `Lancamento` de taxa correspondente — nunca o campo `status` cru.

4. **Custo da obra** — lançamentos com `contratoGlobalId != null` NÃO devem ser somados ao custo (já estão no `ContratoGlobal.valorTotal`). Verificar sempre este campo antes de somar.

5. **Dark mode** — usar `style={{ backgroundColor: 'var(--color-bg)' }}` nos containers raiz. Não usar classes Tailwind de cor diretamente (`bg-white`, `bg-gray-50`) pois não respondem ao tema.

6. **Arquivos** — sempre usar `FileViewer` para abrir arquivos. Nunca `<a target="_blank">`.

7. **Navegação de lançamentos** — ao criar lançamento a partir de uma obra (`?obraId=X`), sempre voltar para `/obras/X`, nunca para `/lancamentos`.

8. **Taxa de admin na etapa de documentação** — `eDocumentacao = true` → taxa de administração não se aplica. Verificar antes de chamar `recalcularTaxaEtapa`.
