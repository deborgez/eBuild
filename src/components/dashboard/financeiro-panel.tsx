'use client'
// src/components/dashboard/financeiro-panel.tsx
import { formatCurrency, formatPercent } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ResumoFinanceiro {
  valorGlobalEstimado: number
  custoObra: number
  custoAvulso: number
  custoContratos: number
  custoTaxa: number
  custoDocumentacao: number
  custoMaterial: number
  custoMaoDeObra: number
  totalPago: number
  totalPendente: number
  totalAprovado: number
  taxaAguardandoPagamento: number
  percentualGasto: number
  custoRealM2: number
  referenciaM2: number
  valorVendaM2: number | null
  administracaoTotal: number | null
  taxaAdminGerada: number
  taxaAdminPaga: number
  administracaoRestante: number | null
  diferencaM2: number
  tendenciaEqualizacao: 'POSITIVO' | 'NEGATIVO' | 'EQUILIBRADO'
  projecaoEqualizacao: number
  equalizacaoFinal: number
  receitaTotal: number | null
  margemBruta: number | null
  margemPct: number | null
  benfeitorias: {
    custoTotal: number; pago: number; pendente: number; aprovado: number
    percentualPago: number; materialPago: number; maoDeObraPago: number
    taxaAdminGerada: number; taxaAdminPaga: number
  }
}

export function FinanceiroPanel({ financeiro, taxaPct }: { financeiro: ResumoFinanceiro; taxaPct: number }) {
  const { tendenciaEqualizacao, diferencaM2, projecaoEqualizacao } = financeiro
  const acimaDaReferencia = diferencaM2 > 0
  const temDados = financeiro.custoObra > 0
  const temAdministracao = financeiro.administracaoTotal !== null

  return (
    <div className="space-y-4">

      {/* ── Bloco 1: Resumo de custos ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Custo da obra</p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>
            {formatCurrency(financeiro.custoObra)}
          </p>
          <div className="mt-2">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              <span>do orçamento</span>
              <span>{formatPercent(financeiro.percentualGasto)}</span>
            </div>
            <div className="rounded-full h-1.5" style={{ backgroundColor: 'var(--color-border)' }}>
              <div className="h-1.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(financeiro.percentualGasto, 100)}%`,
                  backgroundColor: financeiro.percentualGasto > 100 ? '#ef4444' : 'var(--color-brand)',
                }} />
            </div>
          </div>
          {financeiro.custoContratos > 0 && (
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Contratos: {formatCurrency(financeiro.custoContratos)}
            </p>
          )}
          <div className="mt-2 pt-2 border-t flex justify-between text-xs" style={{ borderColor: 'var(--color-border)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              Material: <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(financeiro.custoMaterial)}</span>
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              Mão de obra: <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(financeiro.custoMaoDeObra)}</span>
            </span>
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>
              Administração: <span className="font-semibold text-green-600">{formatCurrency(financeiro.taxaAdminPaga)}</span>
            </span>
          </div>
        </div>

        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Pago</p>
          <p className="text-2xl font-bold text-green-500 mt-2">{formatCurrency(financeiro.totalPago)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Aprovado: {formatCurrency(financeiro.totalAprovado)}
          </p>
        </div>

        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Pendente aprovação</p>
          <p className="text-2xl font-bold text-amber-500 mt-2">{formatCurrency(financeiro.totalPendente)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Aguardando cliente</p>
        </div>

        <div className="stat-card">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Documentação</p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-text-muted)' }}>
            {formatCurrency(financeiro.custoDocumentacao)}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Isolado do custo global</p>
        </div>
      </div>

      {/* ── Bloco 1B: Benfeitorias (dashboard próprio, à parte do custo da obra) ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>
          🏠 Benfeitorias — valores à parte
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Total</p>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>
              {formatCurrency(financeiro.benfeitorias.custoTotal)}
            </p>
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>pago</span>
                <span>{formatPercent(financeiro.benfeitorias.percentualPago)}</span>
              </div>
              <div className="rounded-full h-1.5" style={{ backgroundColor: 'var(--color-border)' }}>
                <div className="h-1.5 rounded-full transition-all bg-green-500"
                  style={{ width: `${Math.min(financeiro.benfeitorias.percentualPago, 100)}%` }} />
              </div>
            </div>
            <div className="mt-2 pt-2 border-t flex justify-between text-xs" style={{ borderColor: 'var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Material: <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(financeiro.benfeitorias.materialPago)}</span>
              </span>
              <span style={{ color: 'var(--color-text-muted)' }}>
                Mão de obra: <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(financeiro.benfeitorias.maoDeObraPago)}</span>
              </span>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span style={{ color: 'var(--color-text-muted)' }}>
                Administração: <span className="font-semibold text-green-600">{formatCurrency(financeiro.benfeitorias.taxaAdminPaga)}</span>
              </span>
            </div>
          </div>

          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Pago</p>
            <p className="text-2xl font-bold text-green-500 mt-2">{formatCurrency(financeiro.benfeitorias.pago)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Aprovado: {formatCurrency(financeiro.benfeitorias.aprovado)}
            </p>
          </div>

          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Pendente</p>
            <p className="text-2xl font-bold text-amber-500 mt-2">{formatCurrency(financeiro.benfeitorias.pendente)}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Aguardando cliente</p>
          </div>

          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Administração sobre benfeitorias</p>
            <p className="text-2xl font-bold mt-2" style={{ color: 'var(--color-brand)' }}>
              {formatCurrency(financeiro.benfeitorias.taxaAdminGerada)}
            </p>
            <p className="text-xs mt-1 text-green-600">
              Recebida: {formatCurrency(financeiro.benfeitorias.taxaAdminPaga)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bloco 2: Administração da construtora ── */}
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Administração da construtora
        </p>

        {!temAdministracao ? (
          <div className="text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-sm">Defina o valor de venda por m² para calcular a administração.</p>
            <p className="text-xs mt-1">Administração = (Valor venda − Referência) × Área</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Administração total */}
            <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--color-bg-header)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                Administração total
              </p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-brand)' }}>
                {formatCurrency(financeiro.administracaoTotal!)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Venda: {formatCurrency(financeiro.valorVendaM2!)}/m² − Ref: {formatCurrency(financeiro.referenciaM2)}/m²
              </p>
            </div>

            {/* Já recebida */}
            <div className="rounded-xl p-4 border border-green-200 dark:border-green-900"
              style={{ backgroundColor: 'rgba(34,197,94,0.06)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-green-600 dark:text-green-400">
                Já recebida
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(financeiro.taxaAdminPaga)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Paga a cada etapa concluída, via taxa de {taxaPct}% sobre o custo da etapa
              </p>
            </div>

            {/* A receber */}
            <div className="rounded-xl p-4 border"
              style={{
                backgroundColor: (financeiro.administracaoRestante ?? 0) > 0 ? 'rgba(99,102,241,0.06)' : 'rgba(34,197,94,0.06)',
                borderColor: (financeiro.administracaoRestante ?? 0) > 0 ? 'var(--color-brand)' : '#86efac',
              }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
                A receber
              </p>
              <p className="text-2xl font-bold" style={{ color: (financeiro.administracaoRestante ?? 0) > 0 ? 'var(--color-brand)' : '#16a34a' }}>
                {formatCurrency(financeiro.administracaoRestante ?? 0)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Administração total − já recebida
              </p>
            </div>
          </div>
        )}

        {/* Barra de progresso da administração */}
        {temAdministracao && financeiro.administracaoTotal! > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
              <span>Progresso de recebimento</span>
              <span>{formatPercent((financeiro.taxaAdminPaga / financeiro.administracaoTotal!) * 100)}</span>
            </div>
            <div className="rounded-full h-2" style={{ backgroundColor: 'var(--color-border)' }}>
              <div className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min((financeiro.taxaAdminPaga / financeiro.administracaoTotal!) * 100, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Bloco 3: Os 3 valores de m² ── */}
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Análise por m²
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Referência */}
          <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--color-bg-header)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--color-text-muted)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Referência (base)
              </p>
            </div>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {formatCurrency(financeiro.referenciaM2)}<span className="text-sm font-normal opacity-60">/m²</span>
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Custo estimado de construção</p>
          </div>

          {/* Venda */}
          <div className="rounded-xl p-4 border"
            style={{
              backgroundColor: financeiro.valorVendaM2 ? 'rgba(59,130,246,0.06)' : 'var(--color-bg-header)',
              borderColor: financeiro.valorVendaM2 ? '#93c5fd' : 'var(--color-border)',
            }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Venda (cobrado)
              </p>
            </div>
            {financeiro.valorVendaM2 ? (
              <>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(financeiro.valorVendaM2)}<span className="text-sm font-normal opacity-60">/m²</span>
                </p>
                <p className="text-xs mt-1 text-blue-500">
                  Receita: {formatCurrency(financeiro.receitaTotal ?? 0)}
                </p>
              </>
            ) : (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>Não definido</p>
            )}
          </div>

          {/* Real */}
          <div className="rounded-xl p-4 border transition-colors"
            style={{
              backgroundColor: !temDados ? 'var(--color-bg-header)' : acimaDaReferencia ? 'rgba(239,68,68,0.06)' : 'rgba(34,197,94,0.06)',
              borderColor: !temDados ? 'var(--color-border)' : acimaDaReferencia ? '#fca5a5' : '#86efac',
            }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: !temDados ? 'var(--color-text-muted)' : acimaDaReferencia ? '#ef4444' : '#22c55e' }} />
              <p className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: !temDados ? 'var(--color-text-muted)' : acimaDaReferencia ? '#dc2626' : '#16a34a' }}>
                Real (calculado)
              </p>
            </div>
            {!temDados ? (
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>Aguardando lançamentos</p>
            ) : (
              <>
                <p className="text-2xl font-bold"
                  style={{ color: acimaDaReferencia ? '#dc2626' : '#16a34a' }}>
                  {formatCurrency(financeiro.custoRealM2)}<span className="text-sm font-normal opacity-60">/m²</span>
                </p>
                <p className="text-xs mt-1"
                  style={{ color: acimaDaReferencia ? '#dc2626' : '#16a34a' }}>
                  {acimaDaReferencia ? '▲' : '▼'} {formatCurrency(Math.abs(diferencaM2))}/m² {acimaDaReferencia ? 'acima' : 'abaixo'} da referência
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--color-bg-header)', color: 'var(--color-text-muted)' }}>
          Equalização calculada sobre: <strong>custo real vs referência</strong>. O valor de venda é apenas informativo.
        </div>
      </div>

      {/* ── Bloco 4: Saldo da obra (equalização) ── */}
      {temDados && tendenciaEqualizacao !== 'EQUILIBRADO' && (
        <div className="card p-5 border-l-4"
          style={{ borderLeftColor: tendenciaEqualizacao === 'POSITIVO' ? '#22c55e' : '#ef4444' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Saldo da obra (projeção)
          </p>
          <p className="text-2xl font-bold"
            style={{ color: tendenciaEqualizacao === 'POSITIVO' ? '#16a34a' : '#dc2626' }}>
            {tendenciaEqualizacao === 'POSITIVO' ? '+' : '-'}{formatCurrency(projecaoEqualizacao)}
          </p>
          <div className="mt-3 rounded-lg p-3 text-xs leading-relaxed"
            style={{
              backgroundColor: tendenciaEqualizacao === 'POSITIVO' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              color: tendenciaEqualizacao === 'POSITIVO' ? '#166534' : '#991b1b',
            }}>
            {tendenciaEqualizacao === 'POSITIVO'
              ? `✓ A obra está gerando um saldo positivo de ${formatCurrency(projecaoEqualizacao)}. Esse valor pode ser considerado como bônus da eficiência da gestão.`
              : `⚠ O custo real está ultrapassando a referência em ${formatCurrency(projecaoEqualizacao)}. Esse saldo negativo pode ser descontado da administração final.`}
          </div>
        </div>
      )}
    </div>
  )
}
