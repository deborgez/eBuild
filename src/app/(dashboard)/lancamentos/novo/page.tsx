'use client'
// src/app/(dashboard)/lancamentos/novo/page.tsx
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Etapa { id: string; nome: string; eDocumentacao: boolean; descricao: string | null; status: string }
interface Obra { id: string; nome: string; etapas: Etapa[] }
interface Contrato { id: string; nome: string; fornecedor: string; valorTotal: number; saldoRestante: number; tipo: string }

function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }

function CampoMoeda({ label, name, value, onChange, required }: {
  label: string; name: string; value: string
  onChange: (n: string, v: string) => void; required?: boolean
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { onChange(name, ''); return }
    onChange(name, (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }
  return (
    <div>
      <label className="label">{label}{required && ' *'}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-text-muted)' }}>R$</span>
        <input type="text" inputMode="numeric" value={value} onChange={handleChange}
          className="input pl-9" placeholder="0,00" required={required} />
      </div>
    </div>
  )
}

interface OrcamentoItem {
  tempId: string; fornecedor: string; valor: string
  descricao: string; arquivo: File | null; arquivoNome: string
}

export default function NovoLancamentoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const obraIdParam = searchParams.get('obraId') ?? ''
  const etapaIdParam = searchParams.get('etapaId') ?? ''
  // Detecta de onde o usuário veio para voltar ao lugar certo
  const origemObra = !!obraIdParam

  const [obras, setObras] = useState<Obra[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [isGlobal, setIsGlobal] = useState(false)
  const [modoComparativo, setModoComparativo] = useState(false)
  const [isParcela, setIsParcela] = useState(false)
  const [isBenfeitoria, setIsBenfeitoria] = useState(false)
  const [contratoSelecionado, setContratoSelecionado] = useState('')

  const [form, setForm] = useState({
    obraId: obraIdParam, etapaId: etapaIdParam,
    descricao: '', tipo: 'MATERIAL', valor: '',
    fornecedor: '', observacoes: '',
  })
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)

  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[]>([
    { tempId: '1', fornecedor: '', valor: '', descricao: '', arquivo: null, arquivoNome: '' },
    { tempId: '2', fornecedor: '', valor: '', descricao: '', arquivo: null, arquivoNome: '' },
  ])

  useEffect(() => {
    fetch('/api/obras').then((r) => r.json()).then((data) => {
      setObras(data)
      if (obraIdParam) {
        const obra = data.find((o: Obra) => o.id === obraIdParam)
        if (obra) setEtapas(obra.etapas ?? [])
      }
    })
  }, [obraIdParam])

  useEffect(() => {
    if (!form.obraId) { setEtapas([]); setContratos([]); return }
    fetch(`/api/obras/${form.obraId}`).then((r) => r.json()).then((d) => setEtapas(d.etapas ?? []))
    fetch(`/api/contratos?obraId=${form.obraId}`).then((r) => r.json()).then((d) => setContratos(d))
  }, [form.obraId])

  useEffect(() => {
    if (contratoSelecionado) {
      const c = contratos.find((x) => x.id === contratoSelecionado)
      if (c) setForm((p) => ({ ...p, tipo: c.tipo, fornecedor: c.fornecedor }))
    }
  }, [contratoSelecionado])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value, ...(name === 'obraId' ? { etapaId: '' } : {}) }))
  }
  function handleValor(name: string, valor: string) { setForm((p) => ({ ...p, [name]: valor })) }

  function handleOrcamento(tempId: string, campo: string, valor: string) {
    setOrcamentos((prev) => prev.map((o) => o.tempId === tempId ? { ...o, [campo]: valor } : o))
  }
  function handleOrcamentoValor(tempId: string, valor: string) {
    setOrcamentos((prev) => prev.map((o) => o.tempId === tempId ? { ...o, valor } : o))
  }
  function handleOrcamentoArquivo(tempId: string, file: File | null) {
    setOrcamentos((prev) => prev.map((o) => o.tempId === tempId ? { ...o, arquivo: file, arquivoNome: file?.name ?? '' } : o))
  }
  function adicionarOrcamento() {
    setOrcamentos((prev) => [...prev, { tempId: Date.now().toString(), fornecedor: '', valor: '', descricao: '', arquivo: null, arquivoNome: '' }])
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

  function formatCurrency(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')

    if (modoComparativo) {
      const validos = orcamentos.filter((o) => o.fornecedor.trim() && o.valor)
      if (validos.length < 2) { setErro('Adicione pelo menos 2 orçamentos.'); setLoading(false); return }
    }
    if (isParcela && !contratoSelecionado) { setErro('Selecione o contrato global.'); setLoading(false); return }
    if (isParcela && contratoSelecionado && !modoComparativo) {
      const contrato = contratos.find((c) => c.id === contratoSelecionado)
      if (contrato && parseMoeda(form.valor) > contrato.saldoRestante + 0.01) {
        setErro(`Valor excede o saldo do contrato (${formatCurrency(contrato.saldoRestante)}).`)
        setLoading(false); return
      }
    }

    let comprovanteUrl: string | undefined
    if (!modoComparativo && comprovanteFile) {
      const fd = new FormData()
      fd.append('file', comprovanteFile)
      fd.append('lancamentoId', 'temp-' + Date.now())
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (r.ok) comprovanteUrl = (await r.json()).url
    }

    const res = await fetch('/api/lancamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        obraId: form.obraId,
        etapaId: isGlobal ? null : form.etapaId || null,
        contratoGlobalId: isParcela && contratoSelecionado ? contratoSelecionado : null,
        descricao: form.descricao, tipo: form.tipo,
        valor: modoComparativo ? 0 : parseMoeda(form.valor),
        fornecedor: modoComparativo ? null : form.fornecedor,
        observacoes: form.observacoes, isGlobal: isGlobal && !isParcela, isBenfeitoria, modoComparativo,
        ...(comprovanteUrl && { comprovanteUrl }),
      }),
    })

    if (!res.ok) { setErro('Erro ao criar lançamento.'); setLoading(false); return }
    const lancamento = await res.json()

    if (modoComparativo) {
      const validos = orcamentos.filter((o) => o.fornecedor.trim() && o.valor)
      for (let i = 0; i < validos.length; i++) {
        const orc = validos[i]
        let arquivoUrl: string | undefined
        if (orc.arquivo) arquivoUrl = await uploadArquivo(orc.arquivo, lancamento.id)
        await fetch('/api/orcamentos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lancamentoId: lancamento.id, fornecedor: orc.fornecedor,
            valor: parseMoeda(orc.valor), descricao: orc.descricao, arquivoUrl, ordem: i,
          }),
        })
      }
    }

    // ── Navegação sequencial ──
    // Se veio de uma obra específica, volta para a obra
    // Se veio da listagem geral de lançamentos, volta para lançamentos
    if (origemObra) {
      router.push(`/obras/${form.obraId}`)
    } else {
      router.push('/lancamentos')
    }
  }

  const contratoAtivo = contratos.find((c) => c.id === contratoSelecionado)
  const voltarPara = origemObra ? `/obras/${obraIdParam}` : '/lancamentos'
  const voltarLabel = origemObra ? '← Voltar à obra' : '← Lançamentos'

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href={voltarPara} className="text-sm hover:underline" style={{ color: 'var(--color-text-muted)' }}>
          {voltarLabel}
        </Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>Novo Lançamento</h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Obra *</label>
          <select name="obraId" value={form.obraId} onChange={handleChange} className="input" required disabled={origemObra}>
            <option value="">Selecione a obra</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </div>

        {form.obraId && (
          <div>
            <label className="label">Tipo de lançamento</label>
            <div className="flex flex-col gap-3">
              <button type="button" onClick={() => { setIsParcela(false); setIsBenfeitoria(false); setContratoSelecionado('') }}
                className="p-3 rounded-xl border-2 text-left transition-all"
                style={{ borderColor: !isParcela && !isBenfeitoria ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: !isParcela && !isBenfeitoria ? 'var(--color-brand-light)' : '' }}>
                <p className="font-medium text-sm" style={{ color: !isParcela && !isBenfeitoria ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>Lançamento normal</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Soma no custo da obra</p>
              </button>
              <button type="button" onClick={() => { setIsBenfeitoria(true); setIsParcela(false); setContratoSelecionado('') }}
                className="p-3 rounded-xl border-2 text-left transition-all"
                style={{ borderColor: isBenfeitoria ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: isBenfeitoria ? 'var(--color-brand-light)' : '' }}>
                <p className="font-medium text-sm" style={{ color: isBenfeitoria ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>Benfeitoria</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Valor à parte, fora do custo</p>
              </button>
              {contratos.length > 0 && (
                <button type="button" onClick={() => { setIsParcela(true); setIsBenfeitoria(false); setIsGlobal(false) }}
                  className="p-3 rounded-xl border-2 text-left transition-all"
                  style={{ borderColor: isParcela ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: isParcela ? 'var(--color-brand-light)' : '' }}>
                  <p className="font-medium text-sm" style={{ color: isParcela ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>Parcela de contrato</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Não soma novamente</p>
                </button>
              )}
            </div>
            {isBenfeitoria && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Melhoria ou acréscimo solicitado pelo cliente fora do projeto inicial. Não entra no custo da obra.
              </p>
            )}
          </div>
        )}

        {isParcela && (
          <div>
            <label className="label">Contrato global *</label>
            <select value={contratoSelecionado} onChange={(e) => setContratoSelecionado(e.target.value)} className="input" required>
              <option value="">Selecione o contrato</option>
              {contratos.filter((c) => c.saldoRestante > 0).map((c) => (
                <option key={c.id} value={c.id}>{c.nome} — Saldo: {formatCurrency(c.saldoRestante)}</option>
              ))}
            </select>
            {contratoAtivo && (
              <div className="mt-2 p-3 rounded-lg border text-xs" style={{ backgroundColor: 'var(--color-bg-header)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between"><span style={{ color: 'var(--color-text-muted)' }}>Saldo disponível</span>
                  <span className="font-semibold text-green-500">{formatCurrency(contratoAtivo.saldoRestante)}</span></div>
              </div>
            )}
          </div>
        )}

        {form.obraId && !isParcela && (
          <div>
            <label className="label">Vínculo *</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setIsGlobal(false)}
                className="p-3 rounded-xl border-2 text-left transition-all"
                style={{ borderColor: !isGlobal ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: !isGlobal ? 'var(--color-brand-light)' : '' }}>
                <p className="font-medium text-sm" style={{ color: !isGlobal ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>📋 Por etapa</p>
              </button>
              <button type="button" onClick={() => setIsGlobal(true)}
                className="p-3 rounded-xl border-2 text-left transition-all"
                style={{ borderColor: isGlobal ? 'var(--color-brand)' : 'var(--color-border)', backgroundColor: isGlobal ? 'var(--color-brand-light)' : '' }}>
                <p className="font-medium text-sm" style={{ color: isGlobal ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>🏗 Global</p>
              </button>
            </div>
          </div>
        )}

        {(!isGlobal || isParcela) && form.obraId && (
          <div>
            <label className="label">Etapa *</label>
            <select name="etapaId" value={form.etapaId} onChange={handleChange} className="input" required>
              <option value="">Selecione a etapa</option>
              {etapas.filter((e) => !e.eDocumentacao && e.status !== 'CONCLUIDA').map((e) => (
                <option key={e.id} value={e.id}>{e.nome}{e.descricao ? ` — ${e.descricao}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Descrição *</label>
          <input type="text" name="descricao" value={form.descricao} onChange={handleChange}
            placeholder={
              isParcela ? `Ex: Parcela 1 — ${contratoAtivo?.nome ?? 'contrato'}`
              : isBenfeitoria ? 'Ex: Troca de piso por porcelanato'
              : 'Ex: Concreto usinado fck 25'
            }
            className="input" required />
        </div>

        {!isParcela && (
          <div>
            <label className="label">Tipo *</label>
            <select name="tipo" value={form.tipo} onChange={handleChange} className="input" required>
              <option value="MATERIAL">Material</option>
              <option value="MAO_DE_OBRA">Mão de obra</option>
            </select>
          </div>
        )}

        <div>
          <label className="label">Observações</label>
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange}
            rows={2} className="input resize-none" placeholder="Informações adicionais..." />
        </div>

        {!isParcela && (
          <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-2">
              <button type="button" onClick={() => setModoComparativo(false)}
                className="py-3 px-4 text-sm font-medium transition-colors"
                style={{ backgroundColor: !modoComparativo ? 'var(--color-brand)' : 'var(--color-bg-header)', color: !modoComparativo ? '#fff' : 'var(--color-text-secondary)' }}>
                Orçamento único
              </button>
              <button type="button" onClick={() => setModoComparativo(true)}
                className="py-3 px-4 text-sm font-medium transition-colors"
                style={{ backgroundColor: modoComparativo ? 'var(--color-brand)' : 'var(--color-bg-header)', color: modoComparativo ? '#fff' : 'var(--color-text-secondary)' }}>
                📊 Comparar orçamentos
              </button>
            </div>
          </div>
        )}

        {(!modoComparativo || isParcela) && (
          <div className="grid grid-cols-2 gap-4">
            <CampoMoeda label="Valor" name="valor" value={form.valor} onChange={handleValor} required />
            {!isParcela && (
              <div>
                <label className="label">Fornecedor</label>
                <input type="text" name="fornecedor" value={form.fornecedor} onChange={handleChange}
                  placeholder="Nome da empresa" className="input" />
              </div>
            )}
          </div>
        )}

        {modoComparativo && !isParcela && (
          <div className="space-y-3">
            {orcamentos.map((orc, i) => (
              <div key={orc.tempId} className="border rounded-xl p-4 space-y-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-header)' }}>
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
              className="w-full py-2.5 border-2 border-dashed rounded-xl text-sm font-medium"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-brand)' }}>
              + Adicionar orçamento
            </button>
          </div>
        )}

        {!modoComparativo && (
          <div>
            <label className="label">Comprovante / NF</label>
            <input type="file" accept=".pdf,image/*"
              onChange={(e) => setComprovanteFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700"
              style={{ color: 'var(--color-text-muted)' }} />
          </div>
        )}

        {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Criar lançamento'}
          </button>
          <Link href={voltarPara} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
