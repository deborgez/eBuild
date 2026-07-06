// src/app/(dashboard)/configuracoes/usuarios/page.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { NovoUsuarioModal } from '@/components/dashboard/novo-usuario-modal'
import { UsuarioAcoes } from '@/components/dashboard/usuario-acoes'

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)
  const isAdmin = (session?.user as any)?.role === 'ADMIN'
  const meuId = (session?.user as any)?.id

  if (!isAdmin) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Acesso restrito. Somente administradores podem gerenciar usuários.
        </p>
      </div>
    )
  }

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, telefone: true, role: true, ativo: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} com acesso ao sistema
        </p>
        <NovoUsuarioModal />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
              {['Nome', 'E-mail', 'Perfil', 'Status', 'Desde'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)' }}>{h}</th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--color-border-soft)' }}>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{u.nome}</td>
                <td className="px-4 py-3" style={{ color: 'var(--color-text-muted)' }}>{u.email}</td>
                <td className="px-4 py-3">
                  <span className="badge text-xs" style={{
                    backgroundColor: u.role === 'ADMIN' ? 'var(--color-brand-light)' : 'var(--color-bg-header)',
                    color: u.role === 'ADMIN' ? 'var(--color-brand)' : 'var(--color-text-muted)',
                  }}>
                    {u.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge text-xs ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  <UsuarioAcoes usuario={u} souEu={u.id === meuId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
