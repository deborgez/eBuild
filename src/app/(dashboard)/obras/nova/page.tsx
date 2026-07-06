'use client'
// src/app/(dashboard)/obras/nova/page.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CampoEndereco } from '@/components/ui/campo-endereco'

interface Cliente { id: string; nome: string; email: string }

function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }
function toMoeda(n: number) { return n > 0 ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '' }

function CampoMoeda({ label, name, value, onChange, placeholder, hint }: {
  label: string; name: string; value: string
  onChange: (n: string, v: string) => void; placeholder?: string; hint?: string
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { onChange(name, ''); return }
    onChange(name, (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  }
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-text-muted)' }}>R$</span>
        <input type="text" inputMode="numeric" value={value} onChange={handleChange}
          placeholder={placeholder ?? '0,00'} className="input pl-9" />
      </div>
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
    </div>
  )
}

export default function NovaObraPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    clienteId: '', nome: '', endereco: '',
    areaM2: '', areaM2Dec: '',          // inteiro + decimal separados
    prazoMeses: '',
    valorGlobalEstimado: '',
    custoBaseReferenciaM2: '2.100,00',
    valorVendaM2: '',
    taxaAdministracaoPct: '16,00',
    dataInicio: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    fetch('/api/clientes').then((r) => r.json()).then(setClientes)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }
  function handleMoeda(name: string, valor: string) { setForm((p) => ({ ...p, [name]: valor })) }

  // Monta a área com 2 casas decimais: "280" + "16" → 280.16
  function getAreaM2(): number {
    const intPart = parseFloat(form.areaM2) || 0
    const decPart = form.areaM2Dec ? parseInt(form.areaM2Dec.padEnd(2, '0').slice(0, 2)) : 0
    return parseFloat(`${intPart}.${String(decPart).padStart(2, '0')}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')

    const areaM2 = getAreaM2()
    if (areaM2 <= 0) { setErro('Informe a área da obra.'); setLoading(false); return }

    const res = await fetch('/api/obras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clienteId: form.clienteId,
        nome: form.nome,
        endereco: form.endereco,
        areaM2,
        prazoMeses: parseInt(form.prazoMeses),
        valorGlobalEstimado: parseMoeda(form.valorGlobalEstimado),
        custoBaseReferenciaM2: parseMoeda(form.custoBaseReferenciaM2),
        valorVendaM2: form.valorVendaM2 ? parseMoeda(form.valorVendaM2) : null,
        taxaAdministracaoPct: parseMoeda(form.taxaAdministracaoPct),
        dataInicio: form.dataInicio,
      }),
    })

    const data = await res.json()
    if (!res.ok) { setErro('Erro ao criar obra.'); setLoading(false); return }

    // Cria etapas padrão
    await Promise.all([
      fetch('/api/etapas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obraId: data.id, nome: 'Etapa 01', ordem: 1, eDocumentacao: false }),
      }),
      fetch('/api/etapas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obraId: data.id, nome: 'Documentação / Taxas Extras', ordem: 99, eDocumentacao: true }),
      }),
    ])

    router.push(`/obras/${data.id}`)
  }

  const previewArea = getAreaM2()
  const refM2 = parseMoeda(form.custoBaseReferenciaM2)
  const vendaM2 = parseMoeda(form.valorVendaM2)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/obras" className="text-sm hover:underline" style={{ color: 'var(--color-text-muted)' }}>← Obras</Link>
        <h1 className="text-2xl font-bold mt-2" style={{ color: 'var(--color-text-primary)' }}>Nova Obra</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          As etapas padrão (Etapa 01 e Documentação) serão criadas automaticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">

        {/* Cliente */}
        <div>
          <label className="label">Cliente *</label>
          <select name="clienteId" value={form.clienteId} onChange={handleChange} className="input" required>
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.email}</option>)}
          </select>
          {clientes.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Nenhum cliente. <Link href="/clientes" className="underline">Cadastrar primeiro</Link>
            </p>
          )}
        </div>

        {/* Nome */}
        <div>
          <label className="label">Nome da obra *</label>
          <input type="text" name="nome" value={form.nome} onChange={handleChange}
            placeholder="Ex: Residência Silva — Alphaville" className="input" required />
        </div>

        {/* Endereço */}
        <CampoEndereco endereco={form.endereco}
          onChangeEndereco={(endereco) => setForm((p) => ({ ...p, endereco }))} />

        {/* Área com 2 casas decimais separadas */}
        <div>
          <label className="label">Área total (m²) *</label>
          <div className="flex items-center gap-2">
            <input
              type="number" name="areaM2" value={form.areaM2} onChange={handleChange}
              placeholder="280" min="0" step="1"
              className="input w-32 text-right"
              required
            />
            <span style={{ color: 'var(--color-text-muted)' }}>,</span>
            <input
              type="number" name="areaM2Dec" value={form.areaM2Dec} onChange={handleChange}
              placeholder="00" min="0" max="99" step="1"
              className="input w-20"
              maxLength={2}
            />
            <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>m²</span>
            {previewArea > 0 && (
              <span className="text-sm font-medium" style={{ color: 'var(--color-brand)' }}>
                = {previewArea.toFixed(2)} m²
              </span>
            )}
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Ex: 280 , 16 = 280,16 m²
          </p>
        </div>

        {/* Prazo */}
        <div>
          <label className="label">Prazo (meses) *</label>
          <input type="number" name="prazoMeses" value={form.prazoMeses} onChange={handleChange}
            placeholder="18" min="1" className="input" required />
        </div>

        {/* Valor global */}
        <CampoMoeda label="Valor global estimado (R$) *" name="valorGlobalEstimado"
          value={form.valorGlobalEstimado} onChange={handleMoeda} placeholder="850.000,00" />

        {/* Parâmetros financeiros */}
        <div className="p-4 rounded-xl border space-y-4"
          style={{ backgroundColor: 'var(--color-bg-header)', borderColor: 'var(--color-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Parâmetros financeiros por m²
          </p>

          <div className="grid grid-cols-2 gap-4">
            <CampoMoeda label="Custo base de referência (R$/m²)"
              name="custoBaseReferenciaM2" value={form.custoBaseReferenciaM2}
              onChange={handleMoeda} hint="Estimativa de custo de construção" />
            <CampoMoeda label="Valor de venda (R$/m²)"
              name="valorVendaM2" value={form.valorVendaM2}
              onChange={handleMoeda} placeholder="2.500,00"
              hint="Valor cobrado do cliente pela gestão" />
          </div>

          <div>
            <label className="label">Taxa de administração (%)</label>
            <div className="relative">
              <input type="text" inputMode="numeric" name="taxaAdministracaoPct"
                value={form.taxaAdministracaoPct} onChange={handleChange}
                className="input pr-8" placeholder="16,00" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: 'var(--color-text-muted)' }}>%</span>
            </div>
          </div>

          {/* Preview */}
          {previewArea > 0 && refM2 > 0 && (
            <div className="rounded-lg p-3 border text-xs space-y-1.5"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
              <p className="font-semibold mb-2" style={{ color: 'var(--color-text-secondary)' }}>Preview dos cálculos</p>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Área</span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{previewArea.toFixed(2)} m²</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--color-text-muted)' }}>Custo estimado total</span>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  R$ {(refM2 * previewArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {vendaM2 > 0 && (
                <>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Receita de venda total</span>
                    <span className="font-medium text-blue-600">
                      R$ {(vendaM2 * previewArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--color-text-muted)' }}>Administração estimada</span>
                    <span className="font-medium" style={{ color: 'var(--color-brand)' }}>
                      R$ {((vendaM2 - refM2) * previewArea).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Data de início */}
        <div>
          <label className="label">Data de início</label>
          <input type="date" name="dataInicio" value={form.dataInicio} onChange={handleChange} className="input" />
        </div>

        {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Criando...' : 'Criar obra'}
          </button>
          <Link href="/obras" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}
