'use client'
// src/components/dashboard/contratos-panel.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { FileViewer } from '@/components/ui/file-viewer'

interface Parcela {
  id: string; valor: number; status: string
  etapa: { nome: string } | null; createdAt: string
}

interface Contrato {
  id: string; nome: string; fornecedor: string; tipo: string
  valorTotal: number; valorPago: number; status: string; observacoes: string | null
  arquivoUrl: string | null
  valorPagoReal: number; valorComprometido: number; saldoRestante: number; percentualPago: number
  parcelas: Parcela[]
}

function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }

export function ContratosPanel({ obraId }: { obraId: string }) {
  const router = useRouter()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [form, setForm] = useState({
    nome: '', fornecedor: '', tipo: 'MAO_DE_OBRA', valorTotal: '', observacoes: '',
  })

  async function carregar() {
    const res = await fetch(`/api/contratos?obraId=${obraId}`)
    const data = await res.json()
    setContratos(data)
  }

  useEffect(() => { carregar() }, [obraId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  function handleValor(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { setForm((p) => ({ ...p, valorTotal: '' })); return }
    setForm((p) => ({ ...p, valorTotal: (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }))
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const fd = new FormData()
    fd.append('obraId', obraId)
    fd.append('nome', form.nome)
    fd.append('fornecedor', form.fornecedor)
    fd.append('tipo', form.tipo)
    fd.append('valorTotal', String(parseMoeda(form.valorTotal)))
    fd.append('observacoes', form.observacoes)
    if (arquivo) fd.append('arquivo', arquivo)

    await fetch('/api/contratos', { method: 'POST', body: fd })

    setLoading(false)
    setCriando(false)
    setArquivo(null)
    setForm({ nome: '', fornecedor: '', tipo: 'MAO_DE_OBRA', valorTotal: '', observacoes: '' })
    await carregar()
    router.refresh()
  }

  async function handleEncerrar(id: string) {
    await fetch(`/api/contratos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ENCERRADO' }),
    })
    await carregar()
  }

  const totalContratos = contratos.reduce((acc, c) => acc + c.valorTotal, 0)
  const totalPagoContratos = contratos.reduce((acc, c) => acc + c.valorPagoReal, 0)

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Contratos globais</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Contratos de obra toda — valor comprometido já entra no custo global
          </p>
        </div>
        <button onClick={() => setCriando(true)} className="btn-secondary text-sm">+ Novo contrato</button>
      </div>

      {contratos.length > 0 && (
        <div className="card p-4 mb-4 grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Total comprometido</p>
            <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(totalContratos)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Total pago</p>
            <p className="text-xl font-bold text-green-500 mt-1">{formatCurrency(totalPagoContratos)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Saldo restante</p>
            <p className={cn('text-xl font-bold mt-1', (totalContratos - totalPagoContratos) > 0 ? 'text-amber-500' : 'text-green-500')}>
              {formatCurrency(totalContratos - totalPagoContratos)}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {contratos.length === 0 && !criando && (
          <div className="card p-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
            <p className="text-sm">Nenhum contrato global cadastrado.</p>
          </div>
        )}

        {contratos.map((c) => {
          const saldoPositivo = c.saldoRestante >= 0
          const quitado = Math.abs(c.saldoRestante) < 0.01

          return (
            <div key={c.id} className="card overflow-hidden">
              <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{c.nome}</p>
                      <span className={cn('badge text-xs', c.status === 'ENCERRADO' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700')}>
                        {c.status === 'ENCERRADO' ? 'Encerrado' : 'Ativo'}
                      </span>
                      <span className="badge bg-gray-100 text-gray-600 text-xs">{c.tipo === 'MATERIAL' ? 'Material' : 'Mão de obra'}</span>
                      {quitado && <span className="badge bg-green-100 text-green-700 text-xs">✓ Quitado</span>}
                      {c.arquivoUrl && (
                        <FileViewer url={c.arquivoUrl} nome={`Contrato — ${c.nome}`}>
                          <span className="badge bg-indigo-100 text-indigo-700 text-xs hover:bg-indigo-200">
                            📎 Ver documento
                          </span>
                        </FileViewer>
                      )}
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Fornecedor: {c.fornecedor}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total comprometido</p>
                    <p className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(c.valorTotal)}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Pago: {formatCurrency(c.valorPagoReal)}</span>
                    <span className={cn(saldoPositivo || quitado ? '' : 'text-red-500 font-medium')}>
                      {quitado ? '✓ Quitado' : saldoPositivo ? `Saldo: ${formatCurrency(c.saldoRestante)}` : `Excedente: ${formatCurrency(Math.abs(c.saldoRestante))}`}
                    </span>
                  </div>
                  <div className="rounded-full h-2" style={{ backgroundColor: 'var(--color-border)' }}>
                    <div className={cn('h-2 rounded-full transition-all', quitado ? 'bg-green-500' : !saldoPositivo ? 'bg-red-500' : 'bg-brand-500')}
                      style={{ width: `${Math.min(c.percentualPago, 100)}%`, backgroundColor: quitado ? undefined : !saldoPositivo ? undefined : 'var(--color-brand)' }} />
                  </div>
                </div>
              </div>

              {c.parcelas.length > 0 && (
                <div>
                  <button onClick={() => setExpandido(expandido === c.id ? null : c.id)}
                    className="w-full px-5 py-2.5 text-left text-xs font-medium flex justify-between items-center"
                    style={{ color: 'var(--color-brand)', backgroundColor: 'var(--color-bg-header)' }}>
                    <span>{expandido === c.id ? '▲ Ocultar' : '▼ Ver'} {c.parcelas.length} parcela(s)</span>
                  </button>
                  {expandido === c.id && (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
                      {c.parcelas.map((p) => (
                        <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                            {p.etapa?.nome ?? 'Sem etapa'} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className={cn('badge text-xs',
                              p.status === 'PAGO' ? 'bg-green-100 text-green-700'
                              : p.status === 'APROVADO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700')}>
                              {p.status === 'PAGO' ? 'Pago' : p.status === 'APROVADO' ? 'Aprovado' : 'Pendente'}
                            </span>
                            <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(p.valor)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {c.status === 'ATIVO' && quitado && (
                <div className="px-5 py-3 border-t flex items-center justify-end"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-header)' }}>
                  <button onClick={() => handleEncerrar(c.id)} className="btn-secondary text-xs py-1 px-3">Encerrar contrato</button>
                </div>
              )}
            </div>
          )
        })}

        {criando && (
          <div className="card p-5 border-2" style={{ borderColor: 'var(--color-brand)' }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text-primary)' }}>Novo contrato global</h3>
            <form onSubmit={handleCriar} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nome do contrato *</label>
                  <input type="text" name="nome" value={form.nome} onChange={handleChange}
                    placeholder="Ex: Empreitada — João Silva" className="input" required />
                </div>
                <div>
                  <label className="label">Fornecedor *</label>
                  <input type="text" name="fornecedor" value={form.fornecedor} onChange={handleChange}
                    placeholder="Nome da empresa" className="input" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tipo *</label>
                  <select name="tipo" value={form.tipo} onChange={handleChange} className="input" required>
                    <option value="MAO_DE_OBRA">Mão de obra</option>
                    <option value="MATERIAL">Material</option>
                  </select>
                </div>
                <div>
                  <label className="label">Valor total (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-text-muted)' }}>R$</span>
                    <input type="text" inputMode="numeric" value={form.valorTotal} onChange={handleValor}
                      placeholder="0,00" className="input pl-9" required />
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Observações</label>
                <input type="text" name="observacoes" value={form.observacoes} onChange={handleChange}
                  placeholder="Ex: R$ 450/m² × 280m²" className="input" />
              </div>

              {/* Upload de arquivo */}
              <div>
                <label className="label">Documento do contrato (PDF, foto, etc.)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                {arquivo && <p className="text-xs text-green-600 mt-1">✓ {arquivo.name}</p>}
              </div>

              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
                O valor total entra imediatamente no custo da obra. Pagamentos nas etapas devem ser vinculados a este contrato.
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Salvando...' : 'Criar contrato'}
                </button>
                <button type="button" onClick={() => setCriando(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
