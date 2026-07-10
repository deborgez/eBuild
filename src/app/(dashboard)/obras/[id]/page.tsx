// src/app/(dashboard)/obras/[id]/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getResumoFinanceiro, recalcularProgressoEtapa } from '@/lib/financeiro'
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { EtapaCard } from '@/components/dashboard/etapa-card'
import { FinanceiroPanel } from '@/components/dashboard/financeiro-panel'
import { EncerrarObraButton } from '@/components/dashboard/encerrar-obra-button'
import { EditarObraButton } from '@/components/dashboard/editar-obra-button'
import { GerenciarEtapasButton } from '@/components/dashboard/gerenciar-etapas-button'
import { ContratosPanel } from '@/components/dashboard/contratos-panel'
import { PrazoIndicador } from '@/components/dashboard/prazo-indicador'
import { ReciboModal } from '@/components/dashboard/recibo-modal'

export default async function ObraDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // Recalcula o progresso real de cada etapa antes de exibir — corrige o caso em que
  // percentualConclusao/status ficam desatualizados (ex: gatilho de atualização não
  // disparado). Mesma estratégia usada para sincronizar o status da FaturaAdmin abaixo.
  const etapaIdsParaRecalcular = await prisma.etapa.findMany({
    where: { obraId: params.id, eDocumentacao: false },
    select: { id: true },
  })
  await Promise.all(etapaIdsParaRecalcular.map((e) => recalcularProgressoEtapa(e.id)))

  const obra = await prisma.obra.findUnique({
    where: { id: params.id },
    include: {
      cliente: true,
      etapas: {
        orderBy: { ordem: 'asc' },
        include: {
          lancamentos: {
            orderBy: { createdAt: 'desc' },
            include: {
              aprovacoes: { orderBy: { createdAt: 'desc' }, take: 1 },
              orcamentos: { orderBy: { ordem: 'asc' } },
            },
          },
          fotos: { orderBy: { createdAt: 'desc' } },
        },
      },
      // Busca faturas COM o lançamento de taxa correspondente para exibir status real
      faturasAdmin: {
        orderBy: { createdAt: 'desc' },
        include: {
          etapa: { select: { nome: true } },
        },
      },
    },
  })

  if (!obra) notFound()

  const financeiro = await getResumoFinanceiro(params.id)
  const etapasNormais = obra.etapas.filter((e) => !e.eDocumentacao)
  const etapaDoc = obra.etapas.find((e) => e.eDocumentacao)
  const progressoGeral = financeiro.progressoGeral ?? 0

  // Para cada fatura, busca o status real do lançamento de taxa correspondente
  // Isso resolve o bug onde a fatura ficava "Pendente" mesmo após ser paga
  const faturasComStatusReal = await Promise.all(
    obra.faturasAdmin.map(async (f) => {
      if (!f.lancamentoId || f.tipoEqualizacao !== null) return f

      const lancamentoTaxa = await prisma.lancamento.findUnique({
        where: { id: f.lancamentoId },
        select: { status: true },
      })

      // Status real: se o lançamento de taxa está PAGO, a fatura também é PAGA
      const statusReal = lancamentoTaxa?.status === 'PAGO' ? 'PAGA' : f.status
      return { ...f, status: statusReal }
    })
  )

  return (
    <div>
      {/* Header — SEM botão "+ Lançamento" genérico */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <Link href="/obras" className="text-sm hover:underline" style={{ color: 'var(--color-text-muted)' }}>
            ← Obras
          </Link>
          <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>
            {obra.nome}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className={cn('badge', STATUS_COLORS[obra.status])}>{STATUS_LABELS[obra.status]}</span>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{obra.areaM2} m²</span>
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{obra.prazoMeses} meses</span>
            {obra.dataInicio && (
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Início: {formatDate(obra.dataInicio)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Link href={`/obras/${obra.id}/relatorio`} className="btn-secondary text-sm">
            📊 Relatório
          </Link>
          <EditarObraButton obra={{
            id: obra.id, nome: obra.nome, endereco: obra.endereco,
            areaM2: obra.areaM2, prazoMeses: obra.prazoMeses,
            valorGlobalEstimado: obra.valorGlobalEstimado,
            custoBaseReferenciaM2: obra.custoBaseReferenciaM2,
            taxaAdministracaoPct: obra.taxaAdministracaoPct,
            valorVendaM2: (obra as any).valorVendaM2 ?? null,
          }} />
          <GerenciarEtapasButton obraId={obra.id} etapas={obra.etapas.map(e => ({
            id: e.id, nome: e.nome, ordem: e.ordem,
            descricao: (e as any).descricao ?? null,
            percentualConclusao: e.percentualConclusao,
            percentualObra: (e as any).percentualObra ?? 0,
            eDocumentacao: e.eDocumentacao, status: e.status,
          }))} />
          {obra.status === 'EM_ANDAMENTO' && <EncerrarObraButton obraId={obra.id} />}
        </div>
      </div>

      {/* Prazo visual */}
      <div className="mb-4">
        <PrazoIndicador
          dataInicio={obra.dataInicio}
          prazoMeses={obra.prazoMeses}
          status={obra.status}
        />
      </div>

      {/* Progresso geral */}
      {etapasNormais.length > 0 && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Progresso geral da obra
            </p>
            <p className={cn('text-lg font-bold', progressoGeral >= 100 ? 'text-green-500' : '')}
              style={{ color: progressoGeral < 100 ? 'var(--color-brand)' : undefined }}>
              {progressoGeral.toFixed(1)}%
            </p>
          </div>
          <div className="rounded-full h-3" style={{ backgroundColor: 'var(--color-border)' }}>
            <div className={cn('h-3 rounded-full transition-all', progressoGeral >= 100 ? 'bg-green-500' : '')}
              style={{
                width: `${Math.min(progressoGeral, 100)}%`,
                backgroundColor: progressoGeral < 100 ? 'var(--color-brand)' : undefined,
              }} />
          </div>
          <div className="flex gap-4 mt-2 flex-wrap">
            {etapasNormais.map((e) => (
              <div key={e.id} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <div className={cn('w-2 h-2 rounded-full',
                  e.percentualConclusao >= 100 ? 'bg-green-500'
                  : e.percentualConclusao > 0 ? 'bg-blue-500' : 'bg-gray-300')} />
                <span>{e.nome}: {e.percentualConclusao.toFixed(0)}%</span>
                {(e as any).percentualObra > 0 && (
                  <span>({(e as any).percentualObra}% da obra)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cliente */}
      <div className="card p-4 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-brand-light)' }}>
          <span className="font-semibold" style={{ color: 'var(--color-brand)' }}>{obra.cliente.nome[0]}</span>
        </div>
        <div>
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{obra.cliente.nome}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {obra.cliente.email} · {obra.cliente.whatsapp}
          </p>
        </div>
      </div>

      {/* Painel financeiro */}
      <FinanceiroPanel financeiro={financeiro} taxaPct={obra.taxaAdministracaoPct} />

      {/* Contratos globais */}
      <ContratosPanel obraId={obra.id} />

      {/* Etapas normais */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Cronograma físico-financeiro
        </h2>
        <div className="space-y-4">
          {etapasNormais.map((etapa) => (
            <EtapaCard
              key={etapa.id}
              etapa={etapa as any}
              obraId={obra.id}
              taxaPct={obra.taxaAdministracaoPct}
              valorGlobalEstimado={obra.valorGlobalEstimado}
            />
          ))}
          {etapasNormais.length === 0 && (
            <div className="card p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
              Nenhuma etapa. Use "Gerenciar etapas" para adicionar.
            </div>
          )}
        </div>
      </div>

      {/* Documentação */}
      {etapaDoc && (
        <div className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"
              style={{ color: 'var(--color-text-primary)' }}>
              Documentação / Taxas Extras
              <span className="badge bg-amber-100 text-amber-800 text-xs">Isolada do custo global</span>
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Use o botão "+ Documento" no rodapé da seção abaixo para adicionar.
            </p>
          </div>
          <EtapaCard etapa={etapaDoc as any} obraId={obra.id} taxaPct={obra.taxaAdministracaoPct} />
        </div>
      )}

      {/* Faturas de administração com status REAL */}
      {faturasComStatusReal.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Faturas de Administração
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                  {['Tipo / Etapa', 'Base', 'Taxa', 'Valor', 'Equalização', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
                {faturasComStatusReal.map((f) => (
                  <tr key={f.id}>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {f.tipoEqualizacao === 'DESCONTO' ? '↓ Desconto equalização'
                        : f.tipoEqualizacao === 'BONUS' ? '↑ Bônus equalização'
                        : 'Taxa de administração'}
                      {(f as any).etapa && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                          {(f as any).etapa.nome}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatCurrency(f.baseCalculo)}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {f.taxaPct > 0 ? `${f.taxaPct}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {formatCurrency(f.valorTaxa)}
                    </td>
                    <td className="px-6 py-4">
                      {f.equalizacaoValor !== 0 ? (
                        <span className={cn('text-sm font-medium',
                          (f.equalizacaoValor ?? 0) > 0 ? 'text-green-500' : 'text-red-500')}>
                          {(f.equalizacaoValor ?? 0) > 0 ? '+' : ''}{formatCurrency(f.equalizacaoValor ?? 0)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('badge',
                        f.status === 'PAGA' ? 'bg-green-100 text-green-700'
                        : f.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600')}>
                        {f.status === 'PAGA' ? 'Paga' : f.status === 'PENDENTE' ? 'Pendente' : f.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ReciboModal faturaId={f.id}>
                        <span className="text-xs font-medium hover:underline" style={{ color: 'var(--color-brand)' }}>
                          🧾 Recibo
                        </span>
                      </ReciboModal>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
