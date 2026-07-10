'use client'
// src/components/dashboard/etapa-card.tsx
import { useState } from 'react'
import { formatCurrency, formatDateTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { FileViewer } from '@/components/ui/file-viewer'
import { AnexarFotoModal } from '@/components/dashboard/anexar-foto-modal'
import { AnexarComprovantePagamentoModal } from '@/components/dashboard/anexar-comprovante-pagamento-modal'
import { FotosEtapa } from '@/components/dashboard/fotos-etapa'
import { DocumentosEtapa } from '@/components/dashboard/documentos-etapa'
import { NovoLancamentoModal } from '@/components/dashboard/novo-lancamento-modal'

interface Orcamento {
  id: string; fornecedor: string; valor: number
  descricao: string | null; arquivoUrl: string | null; escolhido: boolean
}

interface Lancamento {
  id: string; descricao: string; tipo: string; valor: number
  fornecedor: string | null; status: string
  comprovanteUrl: string | null; fotoUrl: string | null
  comprovantePagamentoUrl: string | null
  modoComparativo: boolean; observacoes: string | null
  contratoGlobalId: string | null
  isBenfeitoria: boolean
  orcamentos: Orcamento[]
  aprovacoes: { acao: string; createdAt: Date; ipCliente: string | null }[]
}

interface FotoEtapa {
  id: string; url: string; descricao: string | null
}

interface DocumentoEtapa {
  id: string; nome: string; url: string
}

interface Etapa {
  id: string; nome: string; descricao?: string | null; ordem: number
  percentualConclusao: number; percentualObra?: number; eDocumentacao: boolean; status: string
  lancamentos: Lancamento[]
  fotos?: FotoEtapa[]
  documentos?: DocumentoEtapa[]
}

function calcularProgresso(lancamentos: Lancamento[], taxaPct: number, percentualObra: number, valorGlobalEstimado: number) {
  // Taxa "base" (proporcional ao percentual da etapa) x taxa de benfeitoria (por lançamento) —
  // são cobranças independentes: a de benfeitoria não bloqueia a conclusão da etapa nem
  // depende da existência da taxa base (e vice-versa).
  const lancTaxaBase = lancamentos.filter((l) => l.descricao.startsWith('Taxa de Administração') && !l.descricao.includes('— Benfeitoria:'))
  const lancTaxaBenfeitoria = lancamentos.filter((l) => l.descricao.includes('— Benfeitoria:'))
  // Lançamentos exibidos na lista principal (tudo, exceto a taxa) — inclui benfeitorias
  const lancObraTodos = lancamentos.filter((l) => !l.descricao.startsWith('Taxa de Administração'))
  // Benfeitorias são valores à parte: não somam no custo/progresso da etapa
  const lancObra = lancObraTodos.filter((l) => !l.isBenfeitoria)
  const lancBenfeitorias = lancObraTodos.filter((l) => l.isBenfeitoria)

  const totalValorObra = lancObra.reduce((acc, l) => acc + l.valor, 0)
  const totalPagoObra = lancObra.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
  const totalAprovadoObra = lancObra.filter((l) => ['APROVADO', 'PAGO'].includes(l.status)).reduce((acc, l) => acc + l.valor, 0)

  const totalBenfeitorias = lancBenfeitorias.reduce((acc, l) => acc + l.valor, 0)
  const totalBenfeitoriasPago = lancBenfeitorias.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)

  const taxaGerada = lancTaxaBase.length > 0
  // Taxa base = % da etapa sobre o valor global da obra, não a soma dos lançamentos.
  const totalTaxa = taxaGerada
    ? lancTaxaBase.reduce((acc, l) => acc + l.valor, 0)
    : (percentualObra / 100) * valorGlobalEstimado * (taxaPct / 100)
  const totalTaxaPago = lancTaxaBase.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
  const taxaPaga = taxaGerada && lancTaxaBase.every((l) => l.status === 'PAGO')

  const progressoObra = totalValorObra > 0 ? (totalPagoObra / totalValorObra) * 100 : 0
  const todosObraPagos = totalValorObra > 0 && totalPagoObra >= totalValorObra
  const etapaConcluida = todosObraPagos && taxaPaga

  return {
    progressoObra, etapaConcluida, todosObraPagos,
    totalValorObra, totalPagoObra, totalAprovadoObra,
    totalTaxa, totalTaxaPago, taxaGerada, taxaPaga,
    totalBenfeitorias, totalBenfeitoriasPago,
    lancObra, lancObraTodos, lancBenfeitorias, lancTaxaBase, lancTaxaBenfeitoria,
  }
}

export function EtapaCard({ etapa, obraId, taxaPct = 16, valorGlobalEstimado = 0 }: {
  etapa: Etapa; obraId: string; taxaPct?: number; valorGlobalEstimado?: number
}) {
  const [gerandoLink, setGerandoLink] = useState<string | null>(null)
  const [linkGerado, setLinkGerado] = useState<Record<string, string>>({})
  const [expandidoOrc, setExpandidoOrc] = useState<string | null>(null)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ descricao: '', valor: '', fornecedor: '', observacoes: '' })
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [gerandoTaxa, setGerandoTaxa] = useState(false)

  const {
    progressoObra, etapaConcluida, todosObraPagos,
    totalValorObra, totalPagoObra, totalAprovadoObra,
    totalTaxa, totalTaxaPago, taxaGerada, taxaPaga,
    totalBenfeitorias, totalBenfeitoriasPago,
    lancObra, lancObraTodos, lancBenfeitorias, lancTaxaBase, lancTaxaBenfeitoria,
  } = calcularProgresso(etapa.lancamentos, taxaPct, etapa.percentualObra ?? 0, valorGlobalEstimado)

  const progressoDisplay = etapaConcluida ? 100 : Math.min(progressoObra, 99)
  const statusCor = etapaConcluida ? 'bg-green-100 text-green-700'
    : progressoObra > 0 ? 'bg-blue-100 text-blue-700'
    : 'bg-gray-100 text-gray-500'

  async function gerarLink(lancamentoId: string) {
    setGerandoLink(lancamentoId)
    const res = await fetch(`/api/lancamentos/${lancamentoId}/notificar`, { method: 'POST' })
    const data = await res.json()
    if (data.url) setLinkGerado((p) => ({ ...p, [lancamentoId]: data.url }))
    setGerandoLink(null)
  }

  async function marcarPago(lancamentoId: string) {
    await fetch(`/api/lancamentos/${lancamentoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAGO' }),
    })
    window.location.reload()
  }

  async function gerarTaxaManual() {
    setGerandoTaxa(true)
    await fetch(`/api/etapas/${etapa.id}/gerar-taxa`, { method: 'POST' })
    setGerandoTaxa(false)
    window.location.reload()
  }

  function abrirEdicao(l: Lancamento) {
    setEditandoId(l.id)
    setEditForm({
      descricao: l.descricao,
      valor: l.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      fornecedor: l.fornecedor ?? '',
      observacoes: l.observacoes ?? '',
    })
  }

  async function salvarEdicao(lancamentoId: string) {
    setSalvandoEdit(true)
    const raw = editForm.valor.replace(/\./g, '').replace(',', '.')
    await fetch(`/api/lancamentos/${lancamentoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descricao: editForm.descricao,
        valor: parseFloat(raw) || 0,
        fornecedor: editForm.fornecedor || null,
        observacoes: editForm.observacoes || null,
      }),
    })
    setSalvandoEdit(false)
    setEditandoId(null)
    window.location.reload()
  }

  async function removerLancamento(lancamentoId: string) {
    if (!confirm('Remover este lançamento?')) return
    setRemovendoId(lancamentoId)
    await fetch(`/api/lancamentos/${lancamentoId}`, { method: 'DELETE' })
    setRemovendoId(null)
    window.location.reload()
  }

  function handleEditValor(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { setEditForm((p) => ({ ...p, valor: '' })); return }
    setEditForm((p) => ({ ...p, valor: (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }))
  }

  return (
    <div className="card overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b" style={{ backgroundColor: 'var(--color-bg-header)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5', statusCor)}>
              {etapaConcluida ? '✓' : etapa.ordem}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{etapa.nome}</p>
              {etapa.descricao && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{etapa.descricao}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
                <span>{lancObra.length} lançamento(s)</span>
                <span>Total: {formatCurrency(totalValorObra)}</span>
                <span className="text-green-500">Pago: {formatCurrency(totalPagoObra)}</span>
                {etapa.percentualObra && etapa.percentualObra > 0 && (
                  <span style={{ color: 'var(--color-brand)' }}>{etapa.percentualObra}% da obra</span>
                )}
                {totalBenfeitorias > 0 && (
                  <span style={{ color: '#a855f7' }}>🏠 Benfeitorias: {formatCurrency(totalBenfeitorias)} (à parte)</span>
                )}
              </div>
            </div>
          </div>

          {!etapa.eDocumentacao && (
            <div className="text-right flex-shrink-0">
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Conclusão</p>
              <p className={cn('font-bold text-2xl', etapaConcluida ? 'text-green-500' : '')}
                style={{ color: !etapaConcluida ? 'var(--color-text-primary)' : undefined }}>
                {progressoDisplay.toFixed(0)}%
              </p>
            </div>
          )}
        </div>

        {/* Barras de progresso */}
        {!etapa.eDocumentacao && (
          <div className="mt-3 space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                <span>Lançamentos pagos</span>
                <span>{totalValorObra > 0 ? ((totalPagoObra / totalValorObra) * 100).toFixed(0) : 0}%</span>
              </div>
              <div className="rounded-full h-2" style={{ backgroundColor: 'var(--color-border)' }}>
                <div className="h-2 rounded-full transition-all"
                  style={{
                    width: `${totalValorObra > 0 ? Math.min((totalPagoObra / totalValorObra) * 100, 100) : 0}%`,
                    backgroundColor: 'var(--color-brand)',
                  }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--color-brand)' }}>
                  Taxa de adm. ({taxaPct}%)
                  {!taxaGerada && totalTaxa > 0 && (
                    <span style={{ color: 'var(--color-text-muted)' }}> — estimada: {formatCurrency(totalTaxa)}</span>
                  )}
                  {taxaGerada && <span style={{ color: 'var(--color-text-muted)' }}> — {formatCurrency(totalTaxa)}</span>}
                </span>
                <span className={taxaPaga ? 'text-green-500' : taxaGerada ? 'text-amber-500' : ''}
                  style={{ color: !taxaGerada ? 'var(--color-text-muted)' : undefined }}>
                  {!taxaGerada ? (totalAprovadoObra > 0 ? 'Pendente geração' : '—')
                    : taxaPaga ? '✓ Paga'
                    : `Pendente: ${formatCurrency(totalTaxa - totalTaxaPago)}`}
                </span>
              </div>
              <div className="rounded-full h-2" style={{ backgroundColor: 'var(--color-border)' }}>
                <div className={cn('h-2 rounded-full transition-all', !taxaGerada ? 'opacity-20' : taxaPaga ? 'bg-green-500' : 'bg-amber-400')}
                  style={{
                    width: taxaGerada ? `${totalTaxa > 0 ? Math.min((totalTaxaPago / totalTaxa) * 100, 100) : 0}%` : '100%',
                    backgroundColor: !taxaGerada ? 'var(--color-brand)' : undefined,
                  }} />
              </div>
            </div>

            {todosObraPagos && taxaGerada && !taxaPaga && (
              <p className="text-xs text-amber-500 font-medium">
                ⚠ Todos os lançamentos pagos. Pague a taxa para concluir a etapa.
              </p>
            )}
            {etapaConcluida && (
              <p className="text-xs text-green-500 font-medium">✓ Etapa 100% concluída.</p>
            )}
          </div>
        )}
      </div>

      <FotosEtapa etapaId={etapa.id} fotos={etapa.fotos ?? []} />
      <DocumentosEtapa etapaId={etapa.id} documentos={etapa.documentos ?? []} />

      {/* ── Lançamentos de obra ── */}
      <div className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
        {lancObraTodos.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Nenhum lançamento.{' '}
            <NovoLancamentoModal
              obraId={obraId} etapaId={etapa.id} etapaNome={etapa.nome}
              eDocumentacao={etapa.eDocumentacao} taxaPct={taxaPct}
              onSalvo={() => window.location.reload()}
            />
          </div>
        ) : (
          lancObraTodos.map((l) => (
            <div key={l.id}>
              {editandoId === l.id ? (
                <div className="px-5 py-4 space-y-3" style={{ backgroundColor: 'var(--color-brand-light)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>✏️ Editando</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="label text-xs">Descrição</label>
                      <input value={editForm.descricao}
                        onChange={(e) => setEditForm((p) => ({ ...p, descricao: e.target.value }))}
                        className="input text-sm" />
                    </div>
                    <div>
                      <label className="label text-xs">Valor (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--color-text-muted)' }}>R$</span>
                        <input value={editForm.valor} onChange={handleEditValor} className="input text-sm pl-8" inputMode="numeric" />
                      </div>
                    </div>
                    <div>
                      <label className="label text-xs">Fornecedor</label>
                      <input value={editForm.fornecedor}
                        onChange={(e) => setEditForm((p) => ({ ...p, fornecedor: e.target.value }))}
                        className="input text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="label text-xs">Observações</label>
                      <input value={editForm.observacoes}
                        onChange={(e) => setEditForm((p) => ({ ...p, observacoes: e.target.value }))}
                        className="input text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => salvarEdicao(l.id)} disabled={salvandoEdit} className="btn-primary text-xs py-1.5 px-3">
                      {salvandoEdit ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => setEditandoId(null)} className="btn-secondary text-xs py-1.5 px-3">Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{l.descricao}</p>
                        <span className={cn('badge', STATUS_COLORS[l.status])}>{STATUS_LABELS[l.status]}</span>
                        <span className="badge bg-gray-100 text-gray-600 text-xs">{STATUS_LABELS[l.tipo]}</span>
                        {l.contratoGlobalId && (
                          <span className="badge bg-purple-100 text-purple-700 text-xs">📋 Parcela</span>
                        )}
                        {l.isBenfeitoria && (
                          <span className="badge bg-purple-100 text-purple-700 text-xs">🏠 Benfeitoria — à parte</span>
                        )}
                        {l.modoComparativo && (
                          <span className="badge bg-indigo-100 text-indigo-700 text-xs">📊 {l.orcamentos.length} orç.</span>
                        )}
                      </div>
                      {l.fornecedor && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          Fornecedor: {l.fornecedor}
                        </p>
                      )}

                      {/* Orçamentos comparativos */}
                      {l.modoComparativo && l.orcamentos.length > 0 && (
                        <div className="mt-1.5">
                          <button onClick={() => setExpandidoOrc(expandidoOrc === l.id ? null : l.id)}
                            className="text-xs font-medium" style={{ color: 'var(--color-brand)' }}>
                            {expandidoOrc === l.id ? '▲ Ocultar' : '▼ Ver'} orçamentos
                          </button>
                          {expandidoOrc === l.id && (
                            <div className="mt-2 space-y-1.5">
                              {l.orcamentos.map((orc) => (
                                <div key={orc.id} className="rounded-lg p-2.5 border text-xs flex justify-between"
                                  style={{
                                    backgroundColor: orc.escolhido ? 'rgba(34,197,94,0.06)' : 'var(--color-bg-header)',
                                    borderColor: orc.escolhido ? '#86efac' : 'var(--color-border)',
                                  }}>
                                  <div>
                                    {orc.escolhido && <span className="text-green-600 font-semibold block">✓ Escolhido</span>}
                                    <span style={{ color: 'var(--color-text-primary)' }}>{orc.fornecedor}</span>
                                  </div>
                                  <div className="text-right ml-4 flex-shrink-0">
                                    <span className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                                      {formatCurrency(orc.valor)}
                                    </span>
                                    {orc.arquivoUrl && (
                                      <FileViewer url={orc.arquivoUrl} nome={`Orçamento — ${orc.fornecedor}`}>
                                        <span className="block text-xs hover:underline mt-0.5 cursor-pointer" style={{ color: 'var(--color-brand)' }}>
                                          📄 Ver
                                        </span>
                                      </FileViewer>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {l.aprovacoes[0] && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                          {l.aprovacoes[0].acao === 'APROVADO' ? '✓ Aprovado' : '✗ Reprovado'} em{' '}
                          {formatDateTime(l.aprovacoes[0].createdAt)}
                        </p>
                      )}

                      {/* Foto/link anexado */}
                      {l.fotoUrl && (
                        <div className="mt-1.5">
                          <FileViewer url={l.fotoUrl} nome={`Foto — ${l.descricao}`}>
                            <span className="text-xs cursor-pointer hover:underline" style={{ color: 'var(--color-brand)' }}>
                              📷 Ver foto/comprovante
                            </span>
                          </FileViewer>
                        </div>
                      )}

                      {/* Comprovante de pagamento — anexado após marcar como pago */}
                      {l.comprovantePagamentoUrl && (
                        <div className="mt-1.5">
                          <FileViewer url={l.comprovantePagamentoUrl} nome={`Comprovante de pagamento — ${l.descricao}`}>
                            <span className="text-xs cursor-pointer hover:underline" style={{ color: 'var(--color-brand)' }}>
                              🧾 Ver comprovante de pagamento
                            </span>
                          </FileViewer>
                        </div>
                      )}

                      {linkGerado[l.id] && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-xs font-medium text-green-700 mb-1">✓ Link gerado:</p>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-green-800 bg-green-100 px-2 py-1 rounded flex-1 truncate">
                              {linkGerado[l.id]}
                            </code>
                            <button onClick={() => navigator.clipboard.writeText(linkGerado[l.id])}
                              className="btn-secondary text-xs py-1 px-2 flex-shrink-0">Copiar</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(l.valor)}</p>
                      <div className="flex gap-1.5 mt-2 justify-end flex-wrap">
                        {l.status === 'PENDENTE' && (
                          <button onClick={() => gerarLink(l.id)} disabled={gerandoLink === l.id}
                            className="btn-secondary text-xs py-1 px-2">
                            {gerandoLink === l.id ? '...' : '📲 Link'}
                          </button>
                        )}
                        {/* Foto/link antes de marcar como pago */}
                        {['PENDENTE', 'APROVADO'].includes(l.status) && (
                          <AnexarFotoModal
                            lancamentoId={l.id}
                            onSalvo={() => window.location.reload()}
                          />
                        )}
                        {l.status === 'APROVADO' && (
                          <button onClick={() => marcarPago(l.id)} className="btn-primary text-xs py-1 px-2">
                            ✓ Pago
                          </button>
                        )}
                        {/* Comprovante de pagamento — só depois que o lançamento é marcado como pago */}
                        {l.status === 'PAGO' && (
                          <AnexarComprovantePagamentoModal
                            lancamentoId={l.id}
                            jaAnexado={!!l.comprovantePagamentoUrl}
                            onSalvo={() => window.location.reload()}
                          />
                        )}
                        {['PENDENTE', 'APROVADO'].includes(l.status) && (
                          <button onClick={() => abrirEdicao(l)} className="btn-secondary text-xs py-1 px-2" title="Editar">
                            ✏️
                          </button>
                        )}
                        {l.status === 'PENDENTE' && (
                          <button onClick={() => removerLancamento(l.id)} disabled={removendoId === l.id}
                            className="text-xs py-1 px-2 rounded-lg border text-red-500 hover:bg-red-50 transition-colors"
                            style={{ borderColor: '#fca5a5' }}>
                            {removendoId === l.id ? '...' : '🗑'}
                          </button>
                        )}
                        {l.comprovanteUrl && (
                          <FileViewer url={l.comprovanteUrl} nome={`NF — ${l.descricao}`}>
                            <span className="btn-secondary text-xs py-1 px-2 cursor-pointer">📄</span>
                          </FileViewer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Bloco Taxa de Administração ── */}
      {!etapa.eDocumentacao && (
        <div className="border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-brand-light)' }}>
          {taxaGerada ? (
            lancTaxaBase.map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>{l.descricao}</p>
                  {l.observacoes && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{l.observacoes}</p>
                  )}
                  <p className="text-xs mt-0.5 text-amber-600 font-medium">
                    {!taxaPaga ? 'Pague para concluir a etapa (100%)' : '✓ Taxa paga — etapa concluída'}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="font-bold" style={{ color: 'var(--color-brand)' }}>{formatCurrency(l.valor)}</p>
                  <span className={cn('badge', STATUS_COLORS[l.status])}>{STATUS_LABELS[l.status]}</span>
                  {l.status === 'APROVADO' && (
                    <button onClick={() => marcarPago(l.id)} className="btn-primary text-xs py-1.5 px-3">
                      ✓ Pagar taxa
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-3 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: 'var(--color-brand)' }}>
                  Taxa de Administração ({taxaPct}%) — estimada
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {totalAprovadoObra > 0
                    ? 'Clique em "Gerar taxa" para criar o lançamento de cobrança'
                    : 'Calculada quando os lançamentos forem aprovados/pagos'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="font-bold" style={{ color: 'var(--color-brand)' }}>{formatCurrency(totalTaxa)}</p>
                {totalAprovadoObra > 0 && (
                  <button onClick={gerarTaxaManual} disabled={gerandoTaxa} className="btn-primary text-xs py-1.5 px-3">
                    {gerandoTaxa ? '...' : '⚡ Gerar taxa'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Taxa de benfeitorias: cobrança à parte, por lançamento — não bloqueia a etapa */}
          {lancTaxaBenfeitoria.map((l) => (
            <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: '#a855f7' }}>{l.descricao}</p>
                {l.observacoes && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{l.observacoes}</p>
                )}
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {l.status === 'PAGO' ? '✓ Taxa de benfeitoria paga' : 'Taxa sobre benfeitoria — à parte da etapa'}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="font-bold" style={{ color: '#a855f7' }}>{formatCurrency(l.valor)}</p>
                <span className={cn('badge', STATUS_COLORS[l.status])}>{STATUS_LABELS[l.status]}</span>
                {l.status === 'APROVADO' && (
                  <button onClick={() => marcarPago(l.id)} className="btn-primary text-xs py-1.5 px-3">
                    ✓ Pagar taxa
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="px-5 py-3 border-t flex justify-between items-center"
        style={{ backgroundColor: 'var(--color-bg-header)', borderColor: 'var(--color-border)' }}>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Pago: <span className="text-green-500 font-medium">{formatCurrency(totalPagoObra)}</span>
          {' '}de{' '}
          <span style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totalValorObra)}</span>
        </span>
        {etapaConcluida ? (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            ✓ Etapa concluída — não aceita novos lançamentos
          </span>
        ) : (
          <NovoLancamentoModal
            obraId={obraId} etapaId={etapa.id} etapaNome={etapa.nome}
            eDocumentacao={etapa.eDocumentacao} taxaPct={taxaPct}
            onSalvo={() => window.location.reload()}
          />
        )}
      </div>
    </div>
  )
}
