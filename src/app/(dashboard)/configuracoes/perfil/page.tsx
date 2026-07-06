'use client'
// src/app/(dashboard)/configuracoes/perfil/page.tsx
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { maskCnpj, maskTelefone } from '@/lib/utils'

export default function PerfilPage() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')
  const [trocandoSenha, setTrocandoSenha] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '', email: '', telefone: '', empresa: '', cnpj: '',
  })
  const [senhaForm, setSenhaForm] = useState({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })

  useEffect(() => {
    fetch('/api/perfil').then((r) => r.json()).then((data) => {
      setForm({
        nome: data.nome ?? '',
        email: data.email ?? '',
        telefone: data.telefone ?? '',
        empresa: data.empresa ?? '',
        cnpj: data.cnpj ?? '',
      })
      setRole(data.role ?? null)
    })
  }, [])

  const isAdmin = role === 'ADMIN'

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro(''); setSucesso(false)

    const res = await fetch('/api/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setSucesso(true)
      await update({ name: form.nome })
      setTimeout(() => setSucesso(false), 3000)
    } else {
      setErro('Erro ao salvar perfil.')
    }
    setLoading(false)
  }

  async function handleTrocarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
      setErro('As senhas não coincidem.'); return
    }
    if (senhaForm.novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.'); return
    }
    setLoading(true); setErro('')

    const res = await fetch('/api/perfil/senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(senhaForm),
    })

    if (res.ok) {
      setSucesso(true)
      setSenhaForm({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
      setTrocandoSenha(false)
      setTimeout(() => setSucesso(false), 3000)
    } else {
      const data = await res.json()
      setErro(data.error || 'Erro ao trocar senha.')
    }
    setLoading(false)
  }

  return (
    <div>
      {/* Card de avatar */}
      <div className="card p-6 mb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--color-brand-light)' }}>
          <span className="text-2xl font-bold" style={{ color: 'var(--color-brand)' }}>
            {form.nome?.[0]?.toUpperCase() ?? 'U'}
          </span>
        </div>
        <div>
          <p className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>{form.nome || 'Usuário'}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{form.email}</p>
          {role && (
            <span className="badge text-xs mt-1 inline-block" style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}>
              {isAdmin ? 'Administrador' : 'Usuário'}
            </span>
          )}
        </div>
      </div>

      {/* Form de dados */}
      <form onSubmit={handleSubmit} className="card p-6 space-y-4 mb-4">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Informações pessoais</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Nome completo</label>
            <input type="text" name="nome" value={form.nome} onChange={handleChange} className="input" required />
          </div>
          <div>
            <label className="label">E-mail</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input" required />
          </div>
        </div>

        <div>
          <label className="label">Telefone</label>
          <input type="text" value={form.telefone}
            onChange={(e) => setForm((p) => ({ ...p, telefone: maskTelefone(e.target.value) }))}
            placeholder="(11) 99999-9999" className="input" maxLength={15} />
        </div>

        {isAdmin && (
          <>
            <h2 className="font-semibold text-sm pt-2" style={{ color: 'var(--color-text-primary)' }}>Dados da empresa</h2>
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>
              Somente administradores podem alterar os dados da empresa.
            </p>

            <div>
              <label className="label">Nome da empresa / construtora</label>
              <input type="text" name="empresa" value={form.empresa} onChange={handleChange}
                placeholder="Ex: Construtora Andre LTDA" className="input" />
            </div>

            <div>
              <label className="label">CNPJ</label>
              <input type="text" value={form.cnpj}
                onChange={(e) => setForm((p) => ({ ...p, cnpj: maskCnpj(e.target.value) }))}
                placeholder="00.000.000/0000-00" className="input" maxLength={18} />
            </div>
          </>
        )}

        {sucesso && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            ✓ Perfil atualizado com sucesso!
          </div>
        )}
        {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      {/* Trocar senha */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Segurança</h2>
          {!trocandoSenha && (
            <button onClick={() => setTrocandoSenha(true)} className="text-sm hover:underline"
              style={{ color: 'var(--color-brand)' }}>
              Trocar senha
            </button>
          )}
        </div>

        {trocandoSenha && (
          <form onSubmit={handleTrocarSenha} className="space-y-3 mt-3">
            <div>
              <label className="label">Senha atual</label>
              <input type="password" value={senhaForm.senhaAtual}
                onChange={(e) => setSenhaForm((p) => ({ ...p, senhaAtual: e.target.value }))}
                className="input" required />
            </div>
            <div>
              <label className="label">Nova senha</label>
              <input type="password" value={senhaForm.novaSenha}
                onChange={(e) => setSenhaForm((p) => ({ ...p, novaSenha: e.target.value }))}
                className="input" required minLength={6} />
            </div>
            <div>
              <label className="label">Confirmar nova senha</label>
              <input type="password" value={senhaForm.confirmarSenha}
                onChange={(e) => setSenhaForm((p) => ({ ...p, confirmarSenha: e.target.value }))}
                className="input" required minLength={6} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary text-sm">
                {loading ? 'Salvando...' : 'Atualizar senha'}
              </button>
              <button type="button" onClick={() => setTrocandoSenha(false)} className="btn-secondary text-sm">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
