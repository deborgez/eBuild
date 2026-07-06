'use client'
// src/components/dashboard/novo-cliente-form.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NovoClienteForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    cpfCnpj: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    setSucesso(false)

    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setSucesso(true)
      setForm({ nome: '', email: '', whatsapp: '', cpfCnpj: '' })
      router.refresh()
    } else {
      setErro('Erro ao cadastrar. Verifique os campos.')
    }
    setLoading(false)
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-concrete-900 mb-4">Novo cliente</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome completo *</label>
          <input type="text" name="nome" value={form.nome} onChange={handleChange}
            placeholder="Maria da Silva" className="input" required />
        </div>

        <div>
          <label className="label">E-mail *</label>
          <input type="email" name="email" value={form.email} onChange={handleChange}
            placeholder="maria@email.com" className="input" required />
        </div>

        <div>
          <label className="label">WhatsApp *</label>
          <input type="text" name="whatsapp" value={form.whatsapp} onChange={handleChange}
            placeholder="5511999990000" className="input" required />
          <p className="text-xs text-concrete-400 mt-1">Com código do país: 55 + DDD + número</p>
        </div>

        <div>
          <label className="label">CPF / CNPJ</label>
          <input type="text" name="cpfCnpj" value={form.cpfCnpj} onChange={handleChange}
            placeholder="000.000.000-00" className="input" />
        </div>

        {sucesso && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            ✓ Cliente cadastrado com sucesso!
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? 'Salvando...' : 'Cadastrar cliente'}
        </button>
      </form>
    </div>
  )
}
