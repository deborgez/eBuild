'use client'
// src/components/dashboard/novo-lancamento-modal.tsx
// Popup para adicionar lançamento direto na etapa, sem sair da página

import { useState, useEffect } from 'react'

interface Contrato { id: string; nome: string; saldoRestante: number; tipo: string; fornecedor: string }
interface OrcamentoItem {
  tempId: string; fornecedor: string; valor: string
  descricao: string; arquivo: File | null; arquivoNome: string
}

function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }

function orcamentoVazio(tempId: string): OrcamentoItem {
  return { tempId, fornecedor: '', valor: '', descricao: '', arquivo: null, arquivoNome: '' }
}

export function NovoLancamentoModal({
  obraId, etapaId, etapaNome, eDocumentacao, taxaPct,
  onSalvo,
}: {
  obraId: string; etapaId: string; etapaNome: string
  eDocumentacao: boolean; taxaPct: number
  onSalvo: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [isParcela, setIsParcela] = useState(false)
  const [isBenfeitoria, setIsBenfeitoria] = useState(false)
  const [contratoId, setContratoId] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [modoComparativo, setModoComparativo] = useState(false)
  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[]>([orcamentoVazio('1'), orcamentoVazio('2')])

  const [form, setForm] = useState({
    descricao: '', tipoDocumento: '', tipo: 'MATERIAL',
    valor: '', fornecedor: '', observacoes: '',
  })

  const tiposDocumento = [
    'Alvará de construção', 'ART / RRT', 'Projeto arquitetônico', 'Projeto estrutural',
    'Projeto elétrico', 'Projeto hidráulico', 'Licença ambiental',
    'Taxa de aprovação — Prefeitura', 'ITBI', 'Registro em cartório',
    'Seguro da obra', 'Vistoria / Laudo técnico', 'Outro',
  ]

  useEffect(() => {
    if (aberto && !eDocumentacao) {
      fetch(`/api/contratos?obraId=${obraId}`).then((r) => r.json()).then((data) => {
        setContratos(data.filter((c: any) => c.saldoRestante > 0))
      })
    }
  }, [aberto, obraId, eDocumentacao])

  function handleValor(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { setForm((p) => ({ ...p, valor: '' })); return }
    setForm((p) => ({ ...p, valor: (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }))
  }

  function fechar() {
    setAberto(false)
    setErro('')
    setIsParcela(false)
    setIsBenfeitoria(false)
    setContratoId('')
    setArquivo(null)
    setModoComparativo(false)
    setOrcamentos([orcamentoVazio('1'), orcamentoVazio('2')])
    setForm({ descricao: '', tipoDocumento: '', tipo: 'MATERIAL', valor: '', fornecedor: '', observacoes: '' })
  }

  function handleOrcamento(tempId: string, campo: 'fornecedor' | 'descricao', valor: string) {
    setOrcamentos((prev) => prev.map((o) => o.tempId === tempId ? { ...o, [campo]: valor } : o))
  }
  function handleOrcamentoValor(tempId: string, valor: string) {
    setOrcamentos((prev) => prev.map((o) => o.tempId === tempId ? { ...o, valor } : o))
  }
  function handleOrcamentoArquivo(tempId: string, file: File | null) {
    setOrcamentos((prev) => prev.map((o) => o.tempId === tempId ? { ...o, arquivo: file, arquivoNome: file?.name ?? '' } : o))
  }
  function adicionarOrcamento() {
    setOrcamentos((prev) => [...prev, orcamentoVazio(Date.now().toString())])
  }
  function removerOrcamento(tempId: string) {
    if (orcamentos.length <= 2) return
    setOrcamentos((prev) => prev.filter((o) => o.tempId !== tempId))
  }

  async function uploadArquivo(file: File, lancamentoId: string): Promise<string | undefined> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('lancamentoId', lancamentoId)
    const r = await fetch('/api/upload', { method: 'POST', body: fd })
    if (r.ok) return (await r.json()).url
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    let orcamentosValidos: OrcamentoItem[] = []
    if (comparativoAtivo) {
      orcamentosValidos = orcamentos.filter((o) => o.fornecedor.trim() && o.valor)
      if (orcamentosValidos.length < 2) { setErro('Adicione pelo menos 2 orçamentos.'); return }
    }

    setLoading(true)

    let comprovanteUrl: string | undefined
    if (!comparativoAtivo && arquivo) {
      const fd = new FormData()
      fd.append('file', arquivo)
      fd.append('lancamentoId', 'temp-' + Date.now())
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (r.ok) comprovanteUrl = (await r.json()).url
    }

    const descricaoFinal = eDocumentacao
      ? (form.tipoDocumento === 'Outro' ? form.descricao : form.tipoDocumento + (form.descricao ? ` — ${form.descricao}` : ''))
      : form.descricao

    const res = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obraId, etapaId,
        contratoGlobalId: isParcela && contratoId ? contratoId : null,
        descricao: descricaoFinal,
        tipo: isParcela ? (contratos.find(c => c.id === contratoId)?.tipo ?? 'MATERIAL') : form.tipo,
        valor: comparativoAtivo ? 0 : parseMoeda(form.valor),
        fornecedor: comparativoAtivo ? null : (form.fornecedor || null),
        observacoes: form.observacoes || null,
        isGlobal: false, isBenfeitoria, modoComparativo: comparativoAtivo,
        ...(comprovanteUrl && { comprovanteUrl }),
      }),
    })

    if (!res.ok) { setErro('Erro ao criar lançamento.'); setLoading(false); return }
    const lancamento = await res.json()

    if (comparativoAtivo) {
      for (let i = 0; i < orcamentosValidos.length; i++) {
        const orc = orcamentosValidos[i]
        let arquivoUrl: string | undefined
        if (orc.arquivo) arquivoUrl = await uploadArquivo(orc.arquivo, lancamento.id)
        await fetch('/api/orcamentos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lancamentoId: lancamento.id, fornecedor: orc.fornecedor,
            valor: parseMoeda(orc.valor), descricao: orc.descricao || null, arquivoUrl, ordem: i,
          }),
        })
      }
    }

    setLoading(false)
    fechar()
    onSalvo()
  }

  const contratoSelecionado = contratos.find((c) => c.id === contratoId)
  const formatCurrency = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const comparativoAtivo = modoComparativo && !isParcela && !eDocumentacao

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="text-xs font-medium hover:underline"
        style={{ color: 'var(--color-brand)' }}
      >
        {eDocumentacao ? '+ Documento' : '+ Novo lançamento'}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={fechar}
        >
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-card)', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-header)' }}>
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
                  {eDocumentacao ? '📄 Novo documento' : '+ Novo lançamento'}
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{etapaNome}</p>
              </div>
              <button onClick={fechar} className="text-lg w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                style={{ color: 'var(--color-text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* DOCUMENTAÇÃO */}
              {eDocumentacao && (
                <>
                  <div>
                    <label className="label">Tipo de documento *</label>
                    <select name="tipoDocumento" value={form.tipoDocumento}
                      onChange={(e) => setForm((p) => ({ ...p, tipoDocumento: e.target.value }))}
                      className="input" required>
                      <option value="">Selecione</option>
                      {tiposDocumento.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Complemento {form.tipoDocumento === 'Outro' ? '*' : ''}</label>
                    <input type="text" value={form.descricao}
                      onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                      placeholder="Detalhes adicionais" className="input"
                      required={form.tipoDocumento === 'Outro'} />
                  </div>
                </>
              )}

              {/* LANÇAMENTO NORMAL */}
              {!eDocumentacao && (
                <>
                  {/* Vínculo do lançamento */}
                  <div>
                    <label className="label">Vínculo</label>
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => { setIsParcela(false); setIsBenfeitoria(false); setContratoId('') }}
                        className="p-2.5 rounded-xl border-2 text-left transition-all text-sm"
                        style={{ borderColor: !isParcela && !isBenfeitoria ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: !isParcela && !isBenfeitoria ? 'var(--color-brand-light)' : '' }}>
                        <p className="font-medium" style={{ color: !isParcela && !isBenfeitoria ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>
                          Lançamento normal
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Soma no custo</p>
                      </button>
                      <button type="button" onClick={() => { setIsBenfeitoria(true); setIsParcela(false); setContratoId('') }}
                        className="p-2.5 rounded-xl border-2 text-left transition-all text-sm"
                        style={{ borderColor: isBenfeitoria ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: isBenfeitoria ? 'var(--color-brand-light)' : '' }}>
                        <p className="font-medium" style={{ color: isBenfeitoria ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>
                          Benfeitoria
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Valor à parte</p>
                      </button>
                      {contratos.length > 0 && (
                        <button type="button" onClick={() => { setIsParcela(true); setIsBenfeitoria(false) }}
                          className="p-2.5 rounded-xl border-2 text-left transition-all text-sm"
                          style={{ borderColor: isParcela ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: isParcela ? 'var(--color-brand-light)' : '' }}>
                          <p className="font-medium" style={{ color: isParcela ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>
                            Parcela de contrato
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Não soma novamente</p>
                        </button>
                      )}
                    </div>
                    {isBenfeitoria && (
                      <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                        Melhoria ou acréscimo solicitado pelo cliente fora do projeto inicial. Não entra no custo da obra.
                      </p>
                    )}
                  </div>

                  {isParcela && (
                    <div>
                      <label className="label">Contrato global *</label>
                      <select value={contratoId} onChange={(e) => setContratoId(e.target.value)} className="input" required>
                        <option value="">Selecione</option>
                        {contratos.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome} — saldo: {formatCurrency(c.saldoRestante)}
                          </option>
                        ))}
                      </select>
                      {contratoSelecionado && (
                        <p className="text-xs mt-1 text-green-600">
                          Saldo disponível: {formatCurrency(contratoSelecionado.saldoRestante)}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="label">Descrição *</label>
                    <input type="text" value={form.descricao}
                      onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                      placeholder={
                        isParcela ? `Parcela — ${contratoSelecionado?.nome ?? 'contrato'}`
                        : isBenfeitoria ? 'Ex: Troca de piso por porcelanato'
                        : 'Ex: Concreto usinado fck 25'
                      }
                      className="input" required />
                  </div>

                  {!isParcela && (
                    <div>
                      <label className="label">Tipo *</label>
                      <select value={form.tipo}
                        onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value }))}
                        className="input">
                        <option value="MATERIAL">Material</option>
                        <option value="MAO_DE_OBRA">Mão de obra</option>
                      </select>
                    </div>
                  )}

                  {/* Orçamento único ou comparativo (para aprovação do cliente) */}
                  {!isParcela && (
                    <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="grid grid-cols-2">
                        <button type="button" onClick={() => setModoComparativo(false)}
                          className="py-2.5 px-4 text-sm font-medium transition-colors"
                          style={{ backgroundColor: !modoComparativo ? 'var(--color-brand)' : 'var(--color-bg-header)', color: !modoComparativo ? '#fff' : 'var(--color-text-secondary)' }}>
                          Orçamento único
                        </button>
                        <button type="button" onClick={() => setModoComparativo(true)}
                          className="py-2.5 px-4 text-sm font-medium transition-colors"
                          style={{ backgroundColor: modoComparativo ? 'var(--color-brand)' : 'var(--color-bg-header)', color: modoComparativo ? '#fff' : 'var(--color-text-secondary)' }}>
                          📊 Comparar orçamentos
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Campos comuns (ocultos em modo comparativo — cada orçamento tem seu valor/fornecedor) */}
              {!comparativoAtivo && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Valor (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                        style={{ color: 'var(--color-text-muted)' }}>R$</span>
                      <input type="text" inputMode="numeric" value={form.valor} onChange={handleValor}
                        placeholder="0,00" className="input pl-9" />
                    </div>
                  </div>
                  <div>
                    <label className="label">{eDocumentacao ? 'Responsável / Órgão' : 'Fornecedor'}</label>
                    <input type="text" value={form.fornecedor}
                      onChange={(e) => setForm((p) => ({ ...p, fornecedor: e.target.value }))}
                      placeholder={eDocumentacao ? 'Prefeitura, cartório...' : 'Nome da empresa'}
                      className="input" />
                  </div>
                </div>
              )}

              {/* Orçamentos comparativos */}
              {comparativoAtivo && (
                <div className="space-y-3">
                  {orcamentos.map((orc, i) => (
                    <div key={orc.tempId} className="border rounded-xl p-3 space-y-2" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-header)' }}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Opção {i + 1}</p>
                        {orcamentos.length > 2 && (
                          <button type="button" onClick={() => removerOrcamento(orc.tempId)} className="text-xs text-red-500">✕</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" value={orc.fornecedor} onChange={(e) => handleOrcamento(orc.tempId, 'fornecedor', e.target.value)}
                          placeholder="Fornecedor" className="input" />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-text-muted)' }}>R$</span>
                          <input type="text" inputMode="numeric" value={orc.valor}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '')
                              handleOrcamentoValor(orc.tempId, raw ? (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '')
                            }} placeholder="0,00" className="input pl-9" />
                        </div>
                      </div>
                      <input type="file" accept=".pdf,image/*"
                        onChange={(e) => handleOrcamentoArquivo(orc.tempId, e.target.files?.[0] ?? null)}
                        className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-indigo-50 file:text-indigo-700"
                        style={{ color: 'var(--color-text-muted)' }} />
                      {orc.arquivoNome && <p className="text-xs text-green-600">✓ {orc.arquivoNome}</p>}
                    </div>
                  ))}
                  <button type="button" onClick={adicionarOrcamento}
                    className="w-full py-2 border-2 border-dashed rounded-xl text-sm font-medium"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-brand)' }}>
                    + Adicionar orçamento
                  </button>
                </div>
              )}

              <div>
                <label className="label">Observações</label>
                <textarea value={form.observacoes}
                  onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
                  rows={2} className="input resize-none" />
              </div>

              {!comparativoAtivo && (
                <div>
                  <label className="label">Arquivo / Comprovante</label>
                  <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
                    onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700"
                    style={{ color: 'var(--color-text-muted)' }} />
                  {arquivo && <p className="text-xs text-green-600 mt-1">✓ {arquivo.name}</p>}
                </div>
              )}

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Salvando...' : eDocumentacao ? 'Registrar documento' : 'Criar lançamento'}
                </button>
                <button type="button" onClick={fechar} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
