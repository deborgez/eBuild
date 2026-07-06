// src/app/(dashboard)/lancamentos/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default async function LancamentosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const lancamentos = await prisma.lancamento.findMany({
    include: {
      obra: { select: { id: true, nome: true } },
      etapa: { select: { nome: true, eDocumentacao: true } },
      contratoGlobal: { select: { nome: true } },
      aprovacoes: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const pendentes = lancamentos.filter((l) => l.status === 'PENDENTE').length
  const aprovados = lancamentos.filter((l) => l.status === 'APROVADO').length
  const pagos = lancamentos.filter((l) => l.status === 'PAGO').length
  const totalValor = lancamentos.reduce((acc, l) => acc + l.valor, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Lançamentos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Todos os serviços, materiais e documentos registrados
          </p>
        </div>
        {/* Dois botões: normal e documentação */}
        <div className="flex gap-2">
          <Link href="/lancamentos/novo-doc" className="btn-secondary">
            📄 Documentação
          </Link>
          <Link href="/lancamentos/novo" className="btn-primary">
            + Lançamento
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Pendentes</p>
          <p className="text-3xl font-bold text-amber-500 mt-2">{pendentes}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Aprovados</p>
          <p className="text-3xl font-bold text-blue-500 mt-2">{aprovados}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Pagos</p>
          <p className="text-3xl font-bold text-green-500 mt-2">{pagos}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Valor total</p>
          <p className="text-xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totalValor)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              {['Descrição', 'Obra / Etapa', 'Tipo', 'Valor', 'Status', 'Data', ''].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
            {lancamentos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
                  Nenhum lançamento registrado.{' '}
                  <Link href="/lancamentos/novo" style={{ color: 'var(--color-brand)' }} className="hover:underline">
                    Criar primeiro
                  </Link>
                </td>
              </tr>
            ) : (
              lancamentos.map((l) => (
                <tr key={l.id} className="transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{l.descricao}</p>
                      {l.fornecedor && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{l.fornecedor}</p>
                      )}
                      {l.contratoGlobal && (
                        <span className="badge bg-purple-100 text-purple-700 text-xs mt-1">
                          📋 {l.contratoGlobal.nome}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <Link href={`/obras/${l.obra.id}`} className="text-sm hover:underline"
                        style={{ color: 'var(--color-brand)' }}>
                        {l.obra.nome}
                      </Link>
                      {l.etapa ? (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {l.etapa.nome}
                          {l.etapa.eDocumentacao && (
                            <span className="ml-1 text-amber-500">(documentação)</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          🏗 Contrato global
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge bg-gray-100 text-gray-600 text-xs">
                      {STATUS_LABELS[l.tipo] ?? l.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(l.valor)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('badge', STATUS_COLORS[l.status])}>
                      {STATUS_LABELS[l.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDate(l.createdAt)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/obras/${l.obra.id}`}
                      className="text-xs font-medium hover:underline" style={{ color: 'var(--color-brand)' }}>
                      Ver obra →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
