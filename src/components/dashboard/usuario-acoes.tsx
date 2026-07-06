'use client'
// src/components/dashboard/usuario-acoes.tsx
import { useState } from 'react'

interface Usuario {
  id: string; nome: string; email: string; telefone: string | null
  role: string; ativo: boolean
}

export function UsuarioAcoes({ usuario, souEu }: { usuario: Usuario; souEu: boolean }) {
  const [editando, setEditando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState({
    nome: usuario.nome, email: usuario.email, telefone: usuario.telefone ?? '',
    role: usuario.role, ativo: usuario.ativo, senha: '',
  })

  function fecharEdicao() {
    setEditando(false)
    setErro('')
    setForm({ nome: usuario.nome, email: usuario.email, telefone: usuario.telefone ?? '', role: usuario.role, ativo: usuario.ativo, senha: '' })
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro('')

    const res = await fetch(`/api/usuarios/${usuario.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setErro(typeof data.error === 'string' ? data.error : 'Erro ao salvar usuário.')
      setLoading(false)
      return
    }

    setLoading(false)
    window.location.reload()
  }

  async function excluir() {
    setLoading(true); setErro('')
    const res = await fetch(`/api/usuarios/${usuario.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      setErro(typeof data.error === 'string' ? data.error : 'Erro ao excluir usuário.')
      setLoading(false)
      return
    }
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <button onClick={() => setEditando(true)} className="btn-secondary text-xs py-1 px-2">✏️ Editar</button>
      <button onClick={() => setExcluindo(true)} disabled={souEu}
        title={souEu ? 'Você não pode excluir a si mesmo' : undefined}
        className="text-xs py-1 px-2 rounded-lg border text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: '#fca5a5' }}>
        🗑 Excluir
      </button>

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={fecharEdicao}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-bg-card)' }} onClick={(e) => e.stopPropagation()}>

            <div className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-header)' }}>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>✏️ Editar usuário</h3>
              <button onClick={fecharEdicao} className="text-lg w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70"
                style={{ color: 'var(--color-text-muted)' }}>✕</button>
            </div>

            <form onSubmit={salvar} className="p-6 space-y-4">
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
                <input type="text" value={form.telefone}
                  onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                  className="input" />
              </div>
              <div>
                <label className="label">Nova senha (opcional)</label>
                <input type="password" value={form.senha}
                  onChange={(e) => setForm((p) => ({ ...p, senha: e.target.value }))}
                  placeholder="Deixe em branco para manter a atual" className="input" minLength={6} />
              </div>

              <div>
                <label className="label">Tipo de acesso *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={souEu} onClick={() => setForm((p) => ({ ...p, role: 'CONSTRUTORA' }))}
                    className="p-2.5 rounded-xl border-2 text-left transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      borderColor: form.role === 'CONSTRUTORA' ? 'var(--color-brand)' : 'var(--color-border)',
                      backgroundColor: form.role === 'CONSTRUTORA' ? 'var(--color-brand-light)' : '',
                    }}>
                    <p className="font-medium" style={{ color: form.role === 'CONSTRUTORA' ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>Usuário</p>
                  </button>
                  <button type="button" disabled={souEu} onClick={() => setForm((p) => ({ ...p, role: 'ADMIN' }))}
                    className="p-2.5 rounded-xl border-2 text-left transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      borderColor: form.role === 'ADMIN' ? 'var(--color-brand)' : 'var(--color-border)',
                      backgroundColor: form.role === 'ADMIN' ? 'var(--color-brand-light)' : '',
                    }}>
                    <p className="font-medium" style={{ color: form.role === 'ADMIN' ? 'var(--color-brand)' : 'var(--color-text-primary)' }}>Administrador</p>
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                <input type="checkbox" checked={form.ativo} disabled={souEu}
                  onChange={(e) => setForm((p) => ({ ...p, ativo: e.target.checked }))}
                  className="disabled:opacity-40" />
                Usuário ativo (pode fazer login)
              </label>

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{erro}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={fecharEdicao} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {excluindo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setExcluindo(false)}>
          <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6"
            style={{ backgroundColor: 'var(--color-bg-card)' }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>Excluir usuário</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Tem certeza que deseja excluir <strong>{usuario.nome}</strong>? Essa ação não pode ser desfeita.
            </p>
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 mb-3">{erro}</div>
            )}
            <div className="flex gap-3">
              <button onClick={excluir} disabled={loading}
                className="text-sm py-2 px-4 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-60">
                {loading ? 'Excluindo...' : 'Excluir'}
              </button>
              <button onClick={() => setExcluindo(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
