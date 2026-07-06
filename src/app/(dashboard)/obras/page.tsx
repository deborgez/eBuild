// src/app/(dashboard)/obras/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularProgressoEtapa } from '@/lib/financeiro'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default async function ObrasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Autocorrige percentualConclusao/status de todas as etapas antes de exibir
  // (ver obras/[id]/page.tsx para o mesmo mecanismo)
  const etapaIdsParaRecalcular = await prisma.etapa.findMany({
    where: { eDocumentacao: false },
    select: { id: true },
  })
  await Promise.all(etapaIdsParaRecalcular.map((e) => recalcularProgressoEtapa(e.id)))

  const obras = await prisma.obra.findMany({
    include: {
      cliente: { select: { nome: true } },
      etapas: { select: { nome: true, ordem: true, status: true, percentualConclusao: true, eDocumentacao: true }, orderBy: { ordem: 'asc' } },
      _count: { select: { lancamentos: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calcular progresso médio e etapa atual de cada obra (excluindo etapa documentação)
  const obrasComProgresso = obras.map((obra) => {
    const etapasNormais = obra.etapas.filter((e) => !e.eDocumentacao)
    const progresso = etapasNormais.length > 0
      ? etapasNormais.reduce((acc, e) => acc + e.percentualConclusao, 0) / etapasNormais.length
      : 0
    // Etapa atual = primeira etapa ainda não concluída; se todas concluídas, mostra a última
    const etapaAtual = etapasNormais.find((e) => e.status !== 'CONCLUIDA') ?? etapasNormais[etapasNormais.length - 1]
    return { ...obra, progresso, etapaAtual }
  })

  const stats = {
    total: obras.length,
    emAndamento: obras.filter((o) => o.status === 'EM_ANDAMENTO').length,
    encerradas: obras.filter((o) => o.status === 'ENCERRADA').length,
    valorTotal: obras.reduce((acc, o) => acc + o.valorGlobalEstimado, 0),
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-concrete-900">Obras</h1>
          <p className="text-concrete-500 text-sm mt-1">Gerencie todas as obras em andamento</p>
        </div>
        <Link href="/obras/nova" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nova Obra
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-xs font-semibold text-concrete-400 uppercase tracking-wider">Total de obras</p>
          <p className="text-3xl font-bold text-concrete-900 mt-2">{stats.total}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold text-concrete-400 uppercase tracking-wider">Em andamento</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.emAndamento}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold text-concrete-400 uppercase tracking-wider">Encerradas</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.encerradas}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-semibold text-concrete-400 uppercase tracking-wider">Valor total estimado</p>
          <p className="text-xl font-bold text-concrete-900 mt-2">{formatCurrency(stats.valorTotal)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-concrete-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Obra</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Etapa atual</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Progresso</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Valor estimado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Início</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-concrete-100">
            {obrasComProgresso.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-concrete-400">
                  Nenhuma obra cadastrada ainda.
                  <Link href="/obras/nova" className="text-brand-600 ml-1 hover:underline">Criar primeira obra</Link>
                </td>
              </tr>
            ) : (
              obrasComProgresso.map((obra) => (
                <tr key={obra.id} className="hover:bg-concrete-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-concrete-900 text-sm">{obra.nome}</p>
                      <p className="text-xs text-concrete-400 mt-0.5">{obra.areaM2} m² · {obra.prazoMeses} meses</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-concrete-700">{obra.cliente.nome}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn('badge', STATUS_COLORS[obra.status])}>
                      {STATUS_LABELS[obra.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-concrete-700">
                      {obra.etapaAtual ? obra.etapaAtual.nome : '—'}
                    </p>
                    {obra.etapaAtual && obra.etapaAtual.status === 'CONCLUIDA' && (
                      <p className="text-xs text-green-600 mt-0.5">Concluída</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-concrete-200 rounded-full h-1.5 w-24">
                        <div
                          className="bg-brand-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(obra.progresso, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-concrete-500 w-10">{obra.progresso.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-concrete-700">{formatCurrency(obra.valorGlobalEstimado)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-concrete-500">
                      {obra.dataInicio ? formatDate(obra.dataInicio) : '—'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/obras/${obra.id}`}
                      className="text-brand-600 text-sm font-medium hover:text-brand-700"
                    >
                      Ver detalhes →
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
