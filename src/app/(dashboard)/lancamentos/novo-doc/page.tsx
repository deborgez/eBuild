'use client'
// src/app/(dashboard)/lancamentos/novo-doc/page.tsx
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Obra { id: string; nome: string; etapas: { id: string; nome: string; eDocumentacao: boolean }[] }

function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }

const tiposDocumento = [
  'Alvará de construção',
  'ART / RRT',
  'Projeto arquitetônico',
  'Projeto estrutural',
  'Projeto elétrico',
  'Projeto hidráulico',
  'Licença ambiental',
  'Taxa de aprovação — Prefeitura',
  'ITBI',
  'Registro em cartório',
  'Seguro da obra',
  'Vistoria / Laudo técnico',
  'Outro',
]

export default function NovoLancamentoDocPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const obraIdParam = searchParams.get('obraId') ?? ''
  // Sempre volta para a obra de origem
  const voltarPara = obraIdParam ? `/obras/${obraIdParam}` : '/obras'

  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [arquivo, setArquivo] = useState<File | null>(null)

  const [form, setForm] = useState({
    obraId: obraIdParam,
    tipoDocumento: '',
    descricao: '',
    valor: '',
    fornecedor: '',
    observacoes: '',
  })

  useEffect(() => {
    fetch('/api/obras').then((r) => r.json()).then(setObras)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  function handleValor(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { setForm((p) => ({ ...p, valor: '' })); return }
    setForm((p) => ({ ...p, valor: (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')

    const obra = obras.find((o) => o.id === form.obraId)
    const etapaDoc = obra?.etapas.find((et) => et.eDocumentacao)

    if (!etapaDoc) {
      setErro('Etapa de documentação não encontrada nesta obra.')
      setLoading(false); return
    }

    let comprovanteUrl: string | undefined
    if (arquivo) {
      const fd = new FormData()
      fd.append('file', arquivo)
      fd.append('lancamentoId', 'doc-' + Date.now())
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (r.ok) comprovanteUrl = (await r.json()).url
    }

    const descricaoFinal = form.tipoDocumento === 'Outro'
      ? form.descricao
      : form.tipoDocumento + (form.descricao ? ` — ${form.descricao}` : '')

    const res = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obraId: form.obraId,
        etapaId: etapaDoc.id,
        descricao: descricaoFinal,
        tipo: 'MATERIAL',
        valor: parseMoeda(form.valor),
        fornecedor: form.fornecedor || null,
        observacoes: form.observacoes || null,
        isGlobal: false,
        modoComparativo: false,
        ...(comprovanteUrl && { comprovanteUrl }),
      }),
    })

    if (!res.ok) { setErro('Erro ao registrar documento.'); setLoading(false); return }

    // Sempre volta para a obra — nunca para /lancamentos
    router.push(voltarPara)
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <Link href={voltarPara} className="text-sm hover:underline"
          style={{ color: 'var(--color-text-muted)' }}>
          ← Voltar à obra
        </Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>
          Documentação / Taxas
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Registre documentos e taxas da obra. Valores isolados — não afetam custo global nem administração.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">

        {/* Obra — desabilitado se veio da obra */}
        <div>
          <label className="label">Obra *</label>
          <select name="obraId" value={form.obraId} onChange={handleChange}
            className="input" required disabled={!!obraIdParam}>
            <option value="">Selecione a obra</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>

        {/* Tipo de documento */}
        <div>
          <label className="label">Tipo de documento *</label>
          <select name="tipoDocumento" value={form.tipoDocumento} onChange={handleChange}
            className="input" required>
            <option value="">Selecione o tipo</option>
            {tiposDocumento.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Descrição complementar */}
        <div>
          <label className="label">Descrição {form.tipoDocumento === 'Outro' ? '*' : '(complemento)'}</label>
          <input type="text" name="descricao" value={form.descricao} onChange={handleChange}
            placeholder={form.tipoDocumento === 'Outro' ? 'Descreva o documento' : 'Detalhes adicionais'}
            className="input"
            required={form.tipoDocumento === 'Outro'} />
        </div>

        {/* Valor */}
        <div>
          <label className="label">Valor (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--color-text-muted)' }}>R$</span>
            <input type="text" inputMode="numeric" value={form.valor} onChange={handleValor}
              placeholder="0,00" className="input pl-9" />
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Deixe em branco se não há custo associado.
          </p>
        </div>

        {/* Responsável */}
        <div>
          <label className="label">Responsável / Órgão</label>
          <input type="text" name="fornecedor" value={form.fornecedor} onChange={handleChange}
            placeholder="Ex: Prefeitura de SP, Cartório 3º Ofício..." className="input" />
        </div>

        {/* Observações */}
        <div>
          <label className="label">Observações</label>
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange}
            rows={2} className="input resize-none" />
        </div>

        {/* Upload */}
        <div>
          <label className="label">Arquivo do documento</label>
          <input type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.zip"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700"
            style={{ color: 'var(--color-text-muted)' }} />
          {arquivo && <p className="text-xs text-green-600 mt-1">✓ {arquivo.name}</p>}
        </div>

        <div className="p-3 rounded-lg border text-xs"
          style={{ backgroundColor: 'var(--color-brand-light)', borderColor: 'var(--color-border)', color: 'var(--color-brand)' }}>
          Este lançamento aparecerá no relatório final da obra como documentação, mas não afeta o custo global.
        </div>

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Registrar documento'}
          </button>
          <Link href={voltarPara} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
