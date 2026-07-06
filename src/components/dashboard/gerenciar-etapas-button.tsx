'use client'
// src/components/dashboard/gerenciar-etapas-button.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Etapa {
  id: string; nome: string; ordem: number; descricao: string | null
  percentualConclusao: number; percentualObra: number
  eDocumentacao: boolean; status: string
}

export function GerenciarEtapasButton({ obraId, etapas }: { obraId: string; etapas: Etapa[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [novoPercentualObra, setNovoPercentualObra] = useState('')
  const [loading, setLoading] = useState(false)

  const etapasNormais = etapas.filter((e) => !e.eDocumentacao).sort((a, b) => a.ordem - b.ordem)
  const totalPercentual = etapasNormais.reduce((acc, e) => acc + (e.percentualObra ?? 0), 0)

  async function adicionarEtapa() {
    if (!novoNome.trim()) return
    setLoading(true)
    const proximaOrdem = etapasNormais.length > 0 ? Math.max(...etapasNormais.map((e) => e.ordem)) + 1 : 1
    await fetch('/api/etapas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obraId, nome: novoNome, descricao: novaDescricao,
        ordem: proximaOrdem, eDocumentacao: false,
        percentualObra: parseFloat(novoPercentualObra) || 0,
      }),
    })
    setNovoNome(''); setNovaDescricao(''); setNovoPercentualObra('')
    setLoading(false)
    router.refresh()
  }

  async function atualizarEtapa(etapaId: string, campo: string, valor: string | number) {
    await fetch(`/api/etapas/${etapaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [campo]: valor }),
    })
    router.refresh()
  }

  async function removerEtapa(etapaId: string) {
    if (!confirm('Remover esta etapa? Os lançamentos vinculados também serão removidos.')) return
    await fetch(`/api/etapas/${etapaId}`, { method: 'DELETE' })
    router.refresh()
  }

  const percentualRestante = 100 - totalPercentual
  const percentualOk = Math.abs(totalPercentual - 100) < 0.1

  return (
    <>
      <button onClick={() => setAberto(true)} className="btn-secondary">📋 Gerenciar etapas</button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="p-6 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Gerenciar etapas
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  Configure o cronograma e o percentual de cada etapa na obra
                </p>
              </div>
              <button onClick={() => setAberto(false)} className="text-xl" style={{ color: 'var(--color-text-muted)' }}>✕</button>
            </div>

            <div className="p-6">
              {/* Barra de percentual total */}
              <div className="mb-5 p-3 rounded-xl border"
                style={{ backgroundColor: 'var(--color-bg-header)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: 'var(--color-text-muted)' }}>Percentual total da obra distribuído</span>
                  <span className={percentualOk ? 'text-green-500 font-semibold' : totalPercentual > 100 ? 'text-red-500 font-semibold' : 'text-amber-500 font-semibold'}>
                    {totalPercentual.toFixed(0)}% / 100%
                    {percentualOk ? ' ✓' : totalPercentual > 100 ? ' (excede!)' : ` (faltam ${percentualRestante.toFixed(0)}%)`}
                  </span>
                </div>
                <div className="rounded-full h-2" style={{ backgroundColor: 'var(--color-border)' }}>
                  <div className={`h-2 rounded-full transition-all ${percentualOk ? 'bg-green-500' : totalPercentual > 100 ? 'bg-red-500' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(totalPercentual, 100)}%` }} />
                </div>
              </div>

              {/* Etapas existentes */}
              <div className="space-y-3 mb-6">
                {etapasNormais.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>
                    Nenhuma etapa cadastrada.
                  </p>
                ) : (
                  etapasNormais.map((etapa) => (
                    <div key={etapa.id} className="border rounded-xl p-4"
                      style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5"
                          style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                          {etapa.ordem}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input
                            defaultValue={etapa.nome}
                            onBlur={(e) => atualizarEtapa(etapa.id, 'nome', e.target.value)}
                            className="input font-medium" placeholder="Nome da etapa" />
                          <input
                            defaultValue={etapa.descricao ?? ''}
                            onBlur={(e) => atualizarEtapa(etapa.id, 'descricao', e.target.value)}
                            className="input text-sm"
                            placeholder="Escopo desta etapa (ex: Fundação completa, radier, estacas)" />
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="label text-xs">% da obra que esta etapa representa</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" min="0" max="100" step="1"
                                  defaultValue={etapa.percentualObra ?? 0}
                                  onBlur={(e) => atualizarEtapa(etapa.id, 'percentualObra', parseFloat(e.target.value) || 0)}
                                  className="input w-24 text-right" />
                                <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>%</span>
                              </div>
                            </div>
                            <div className="flex-1">
                              <label className="label text-xs">Progresso de conclusão</label>
                              <div className="flex items-center gap-1">
                                <div className="flex-1 rounded-full h-2" style={{ backgroundColor: 'var(--color-border)' }}>
                                  <div className="h-2 rounded-full bg-green-500 transition-all"
                                    style={{ width: `${etapa.percentualConclusao}%` }} />
                                </div>
                                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                  {etapa.percentualConclusao.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => removerEtapa(etapa.id)}
                          className="text-red-400 hover:text-red-600 flex-shrink-0 mt-1">🗑</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Adicionar nova etapa */}
              <div className="border-2 border-dashed rounded-xl p-4"
                style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  + Nova etapa
                </p>
                <div className="space-y-2">
                  <input type="text" value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Nome (ex: Etapa 02 — Estrutura)" className="input" />
                  <input type="text" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)}
                    placeholder="Escopo / o que será feito" className="input" />
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <label className="label text-xs">% da obra</label>
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" max="100" step="1"
                          value={novoPercentualObra}
                          onChange={(e) => setNovoPercentualObra(e.target.value)}
                          placeholder="0" className="input text-right" />
                        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>%</span>
                      </div>
                    </div>
                    {percentualRestante > 0 && (
                      <p className="text-xs mt-4" style={{ color: 'var(--color-text-muted)' }}>
                        Restam {percentualRestante.toFixed(0)}% para distribuir
                      </p>
                    )}
                  </div>
                  <button onClick={adicionarEtapa} disabled={loading || !novoNome.trim()}
                    className="btn-primary">
                    {loading ? 'Adicionando...' : 'Adicionar etapa'}
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg text-xs"
                style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                <strong>Dica:</strong> A soma dos percentuais deve ser 100%. Ao concluir cada etapa, o sistema somará automaticamente o percentual dela no progresso geral da obra.
              </div>
            </div>

            <div className="p-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button onClick={() => setAberto(false)} className="btn-secondary w-full justify-center">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
