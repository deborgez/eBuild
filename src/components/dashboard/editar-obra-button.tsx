'use client'
// src/components/dashboard/editar-obra-button.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CampoEndereco } from '@/components/ui/campo-endereco'

interface Obra {
  id: string; nome: string; endereco: string | null
  areaM2: number; prazoMeses: number
  valorGlobalEstimado: number; custoBaseReferenciaM2: number
  taxaAdministracaoPct: number; valorVendaM2: number | null
}

function parseMoeda(v: string) { return parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 }
function toMoeda(n: number) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

function CampoMoeda({ label, name, value, onChange, hint }: {
  label: string; name: string; value: string
  onChange: (n: string, v: string) => void; hint?: string
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
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-concrete-400 text-sm">R$</span>
        <input type="text" inputMode="numeric" value={value} onChange={handleChange} className="input pl-9" placeholder="0,00" />
      </div>
      {hint && <p className="text-xs text-concrete-400 mt-1">{hint}</p>}
    </div>
  )
}

export function EditarObraButton({ obra }: { obra: Obra }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nome: obra.nome,
    endereco: obra.endereco ?? '',
    areaM2: String(obra.areaM2),
    prazoMeses: String(obra.prazoMeses),
    valorGlobalEstimado: toMoeda(obra.valorGlobalEstimado),
    custoBaseReferenciaM2: toMoeda(obra.custoBaseReferenciaM2),
    taxaAdministracaoPct: toMoeda(obra.taxaAdministracaoPct),
    valorVendaM2: obra.valorVendaM2 ? toMoeda(obra.valorVendaM2) : '',
  })

  function handleText(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }
  function handleMoeda(name: string, valor: string) {
    setForm((p) => ({ ...p, [name]: valor }))
  }

  async function handleSalvar() {
    setLoading(true)
    await fetch(`/api/obras/${obra.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: form.nome,
        endereco: form.endereco,
        areaM2: parseFloat(form.areaM2.replace(',', '.')),
        prazoMeses: parseInt(form.prazoMeses),
        valorGlobalEstimado: parseMoeda(form.valorGlobalEstimado),
        custoBaseReferenciaM2: parseMoeda(form.custoBaseReferenciaM2),
        taxaAdministracaoPct: parseMoeda(form.taxaAdministracaoPct),
        valorVendaM2: form.valorVendaM2 ? parseMoeda(form.valorVendaM2) : null,
      }),
    })
    setLoading(false)
    setAberto(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setAberto(true)} className="btn-secondary">✏️ Editar obra</button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-concrete-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-concrete-900">Editar obra</h2>
              <button onClick={() => setAberto(false)} className="text-concrete-400 hover:text-concrete-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nome da obra</label>
                <input type="text" name="nome" value={form.nome} onChange={handleText} className="input" />
              </div>
              <CampoEndereco endereco={form.endereco}
                onChangeEndereco={(endereco) => setForm((p) => ({ ...p, endereco }))} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Área (m²)</label>
                  <input type="number" name="areaM2" value={form.areaM2} onChange={handleText} className="input" step="0.1" />
                </div>
                <div>
                  <label className="label">Prazo (meses)</label>
                  <input type="number" name="prazoMeses" value={form.prazoMeses} onChange={handleText} className="input" />
                </div>
              </div>
              <CampoMoeda label="Valor global estimado (R$)" name="valorGlobalEstimado" value={form.valorGlobalEstimado} onChange={handleMoeda} />

              <div className="p-4 bg-concrete-50 rounded-xl border border-concrete-200 space-y-4">
                <p className="text-sm font-semibold text-concrete-700">Parâmetros financeiros por m²</p>
                <div className="grid grid-cols-2 gap-4">
                  <CampoMoeda label="Custo base referência (R$/m²)" name="custoBaseReferenciaM2" value={form.custoBaseReferenciaM2} onChange={handleMoeda} hint="Estimativa de custo" />
                  <CampoMoeda label="Valor de venda (R$/m²)" name="valorVendaM2" value={form.valorVendaM2} onChange={handleMoeda} hint="Valor cobrado do cliente" />
                </div>
                <div>
                  <label className="label">Taxa de administração (%)</label>
                  <div className="relative">
                    <input type="text" inputMode="numeric" name="taxaAdministracaoPct" value={form.taxaAdministracaoPct} onChange={handleText} className="input pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-400 text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-concrete-200 flex gap-3">
              <button onClick={handleSalvar} disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button onClick={() => setAberto(false)} className="btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
