// src/app/(dashboard)/page.tsx  (ou dashboard/page.tsx se preferir)
// Redireciona / para /dashboard
// Crie também src/app/(dashboard)/dashboard/page.tsx com este conteúdo

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getResumoFinanceiro } from '@/lib/financeiro'
import { formatCurrency } from '@/lib/utils'

async function getDashboardData() {
  const [obras, clientes] = await Promise.all([
    prisma.obra.findMany({
      select: { id: true, status: true, areaM2: true, custoBaseReferenciaM2: true, valorVendaM2: true },
    }),
    prisma.cliente.count(),
  ])

  // Métricas de obras
  const totalObras = obras.length
  const obrasEmAndamento = obras.filter((o) => o.status === 'EM_ANDAMENTO').length
  const obrasPausadas = obras.filter((o) => o.status === 'PAUSADA').length
  const obrasEncerradas = obras.filter((o) => o.status === 'ENCERRADA').length

  // Administração total = soma de (valorVendaM2 - referenciaM2) × área de cada obra com venda definida.
  const administracaoTotal = obras
    .filter((o) => o.valorVendaM2 !== null)
    .reduce((acc, o) => acc + (o.valorVendaM2! - o.custoBaseReferenciaM2) * o.areaM2, 0)

  // Usa getResumoFinanceiro por obra para já vir com a parcela de benfeitorias
  // excluída da administração da obra (cobrança é única, mas o valor referente às
  // benfeitorias não deve contar como "administração recebida" do custo normal).
  const resumos = await Promise.all(obras.map((o) => getResumoFinanceiro(o.id)))

  const administracaoRecebida = resumos.reduce((acc, r) => acc + r.taxaAdminPaga, 0)
  const administracaoAReceber = administracaoTotal - administracaoRecebida

  return {
    totalObras, obrasEmAndamento, obrasPausadas, obrasEncerradas, totalClientes: clientes,
    administracaoTotal, administracaoRecebida, administracaoAReceber,
  }
}

function StatCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color?: string; icon: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
            {label}
          </p>
          <p className="text-2xl font-bold mt-2 truncate" style={{ color: color ?? 'var(--color-text-primary)' }}>
            {value}
          </p>
          {sub && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 text-xl"
          style={{ backgroundColor: 'var(--color-bg-header)' }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const d = await getDashboardData()

  const nomeUsuario = (session.user as any)?.name?.split(' ')[0] ?? 'usuário'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {saudacao}, {nomeUsuario}! 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Aqui está o resumo geral do seu portfólio de obras.
          </p>
        </div>
        <Link href="/obras/nova" className="btn-primary">
          + Nova obra
        </Link>
      </div>

      {/* Cards de obras */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Obras
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total de obras" value={String(d.totalObras)} icon="🏗"
            sub={`${d.totalClientes} clientes`} />
          <StatCard label="Em andamento" value={String(d.obrasEmAndamento)} icon="🔨"
            color="var(--color-brand)" sub="obras ativas" />
          <StatCard label="Pausadas" value={String(d.obrasPausadas)} icon="⏸"
            color="#f59e0b" />
          <StatCard label="Encerradas" value={String(d.obrasEncerradas)} icon="✅"
            color="#22c55e" />
        </div>
      </div>

      {/* Administração da construtora */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          Administração da construtora
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Administração total" value={formatCurrency(d.administracaoTotal)} icon="📊" />
          <StatCard label="Já recebida" value={formatCurrency(d.administracaoRecebida)} icon="✅" color="#22c55e" />
          <StatCard label="A receber" value={formatCurrency(d.administracaoAReceber)} icon="⏳" color="#f59e0b" />
        </div>
      </div>

    </div>
  )
}
