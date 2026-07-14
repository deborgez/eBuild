'use client'
// src/components/dashboard/editar-lancamento-modal.tsx
// Edição completa de um lançamento já existente — mesmos campos do "Novo lançamento", já preenchidos.

import { useState } from 'react'

interface LancamentoEditavel {
  id: string; descricao: string; tipo: string; valor: number
  fornecedor: string | null; observacoes: string | null
  isBenfeitoria: boolean; contratoGlobalId: string | null
}

const TIPOS_DOCUMENTO = [
  'Alvará de construção', 'ART / RRT', 'Projeto arquitetônico', 'Projeto estrutural',
  'Projeto elétrico', 'Projeto hidráulico', 'Licença ambiental',
  'Taxa de aprovação — Prefeitura', 'ITBI', 'Registro em cartório',
  'Seguro da obra', 'Vistoria / Laudo técnico', 'Outro',
]

function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }

function separarDescricaoDocumento(descricao: string) {
  const tipo = TIPOS_DOCUMENTO.find((t) => t !== 'Outro' && (descricao === t || descricao.startsWith(`${t} — `)))
  if (!tipo) return { tipoDocumento: 'Outro', complemento: descricao }
  const complemento = descricao === tipo ? '' : descricao.slice(tipo.length + 3)
  return { tipoDocumento: tipo, complemento }
}

export function EditarLancamentoModal({
  lancamento, eDocumentacao, onFechar, onSalvo,
}: {
  lancamento: LancamentoEditavel
  eDocumentacao: boolean
  onFechar: () => void
  onSalvo: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [isBenfeitoria, setIsBenfeitoria] = useState(lancamento.isBenfeitoria)
  const [arquivo, setArquivo] = useState<File | null>(null)

  const docInicial = eDocumentacao ? separarDescricaoDocumento(lancamento.descricao) : null

  const [form, setForm] = useState({
    descricao: eDocumentacao ? (docInicial?.complemento ?? '') : lancamento.descricao,
    tipoDocumento: docInicial?.tipoDocumento ?? '',
    tipo: lancamento.tipo,
    valor: lancamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
    fornecedor: lancamento.fornecedor ?? '',
    observacoes: lancamento.observacoes ?? '',
  })

  function handleValor(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { setForm((p) => ({ ...p, valor: '' })); return }
    setForm((p) => ({ ...p, valor: (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    let comprovanteUrl: string | undefined
    if (arquivo) {
      const fd = new FormData()
      fd.append('file', arquivo)
      fd.append('lancamentoId', lancamento.id)
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (r.ok) comprovanteUrl = (await r.json()).url
    }

    const descricaoFinal = eDocumentacao
      ? (form.tipoDocumento === 'Outro' ? form.descricao : form.tipoDocumento + (form.descricao ? ` — ${form.descricao}` : ''))
      : form.descricao

    const res = await fetch(`/api/lancamentos/${lancamento.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descricao: descricaoFinal,
        tipo: lancamento.contratoGlobalId ? lancamento.tipo : form.tipo,
        valor: parseMoeda(form.valor),
        fornecedor: form.fornecedor || null,
        observacoes: form.observacoes || null,
        isBenfeitoria,
        ...(comprovanteUrl && { comprovanteUrl }),
      }),
    })

    setLoading(false)
    if (!res.ok) { setErro('Erro ao salvar as alterações.'); return }
    onSalvo()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onFechar}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-card)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-header)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            ✏️ Editar {eDocumentacao ? 'documento' : 'lançamento'}
          </h3>
          <button onClick={onFechar} className="text-lg w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
            style={{ color: 'var(--color-text-muted)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {lancamento.contratoGlobalId && (
            <div className="p-2.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
              📋 Parcela de contrato global — o vínculo com o contrato não pode ser alterado aqui.
            </div>
          )}

          {eDocumentacao && (
            <>
              <div>
                <label className="label">Tipo de documento *</label>
                <select value={form.tipoDocumento}
                  onChange={(e) => setForm((p) => ({ ...p, tipoDocumento: e.target.value }))}
                  className="input" required>
                  <option value="">Selecione</option>
                  {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
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

          {!eDocumentacao && (
            <>
              <div>
                <label className="label">Vínculo</label>
                <div className="flex gap-2">
                  <button type="button" disabled={!!lancamento.contratoGlobalId}
                    onClick={() => setIsBenfeitoria(false)}
                    className="flex-1 p-2.5 rounded-xl border-2 text-left transition-all text-sm disabled:opacity-50"
                    style={{ borderColor: !isBenfeitoria ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: !isBenfeitoria ? 'var(--color-brand-light)' : '' }}>
                    <p className="font-medium" style={{ color: !isBenfeitoria ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>Normal</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Soma no custo</p>
                  </button>
                  <button type="button" disabled={!!lancamento.contratoGlobalId}
                    onClick={() => setIsBenfeitoria(true)}
                    className="flex-1 p-2.5 rounded-xl border-2 text-left transition-all text-sm disabled:opacity-50"
                    style={{ borderColor: isBenfeitoria ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: isBenfeitoria ? 'var(--color-brand-light)' : '' }}>
                    <p className="font-medium" style={{ color: isBenfeitoria ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>Benfeitoria</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Valor à parte</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Descrição *</label>
                <input type="text" value={form.descricao}
                  onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  className="input" required />
              </div>

              {!lancamento.contratoGlobalId && (
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
            </>
          )}

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
                className="input" />
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea value={form.observacoes}
              onChange={(e) => setForm((p) => ({ ...p, observacoes: e.target.value }))}
              rows={2} className="input resize-none" />
          </div>

          <div>
            <label className="label">Substituir arquivo / comprovante</label>
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700"
              style={{ color: 'var(--color-text-muted)' }} />
            {arquivo && <p className="text-xs text-green-600 mt-1">✓ {arquivo.name}</p>}
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <button type="button" onClick={onFechar} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
