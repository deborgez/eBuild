'use client'
// src/components/dashboard/novo-usuario-modal.tsx
import { useState } from 'react'
import { maskTelefone } from '@/lib/utils'

export function NovoUsuarioModal() {
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', senha: '', role: 'CONSTRUTORA' })

  function fechar() {
    setAberto(false)
    setErro('')
    setForm({ nome: '', email: '', telefone: '', senha: '', role: 'CONSTRUTORA' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setErro(typeof data.error === 'string' ? data.error : 'Erro ao criar usuário.')
      setLoading(false)
      return
    }

    setLoading(false)
    fechar()
    window.location.reload()
  }

  return (
    <>
      <button onClick={() => setAberto(true)} className="btn-primary text-sm">
        + Novo usuário
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={fechar}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-card)' }} onClick={(e) => e.stopPropagation()}>

            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-header)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>+ Novo usuário</h3>
              <button onClick={fechar} className="text-lg w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                style={{ color: 'var(--color-text-muted)' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Nome completo *</label>
                <input type="text" value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  className="input" required />
              </div>
              <div>
                <label className="label">E-mail *</label>
                <input type="email" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="input" required />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input type="text" inputMode="numeric" value={form.telefone}
                  onChange={(e) => setForm((p) => ({ ...p, telefone: maskTelefone(e.target.value) }))}
                  placeholder="(11) 99999-9999" className="input" maxLength={15} />
              </div>
              <div>
                <label className="label">Senha *</label>
                <input type="password" value={form.senha}
                  onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))}
                  className="input" required minLength={6} />
              </div>
              <div>
                <label className="label">Tipo de acesso *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm((p) => ({ ...p, role: 'CONSTRUTORA' }))}
                    className="p-2.5 rounded-xl border-2 text-left transition-all text-sm"
                    style={{
                      borderColor: form.role === 'CONSTRUTORA' ? 'var(--color-brand)' : 'var(--color-border)',
                      backgroundColor: form.role === 'CONSTRUTORA' ? 'var(--color-brand-light)' : '',
                    }}>
                    <p className="font-medium" style={{ color: form.role === 'CONSTRUTORA' ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>
                      Usuário
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Só edita o próprio perfil</p>
                  </button>
                  <button type="button" onClick={() => setForm((p) => ({ ...p, role: 'ADMIN' }))}
                    className="p-2.5 rounded-xl border-2 text-left transition-all text-sm"
                    style={{
                      borderColor: form.role === 'ADMIN' ? 'var(--color-brand)' : 'var(--color-border)',
                      backgroundColor: form.role === 'ADMIN' ? 'var(--color-brand-light)' : '',
                    }}>
                    <p className="font-medium" style={{ color: form.role === 'ADMIN' ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>
                      Administrador
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Acesso total + usuários</p>
                  </button>
                </div>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Criando...' : 'Criar usuário'}
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
