// src/app/(dashboard)/configuracoes/layout.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ConfiguracoesTabs } from '@/components/dashboard/configuracoes-tabs'

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const isAdmin = (session.user as any).role === 'ADMIN'

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Configurações</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Gerencie seu perfil{isAdmin ? ', os dados da empresa e os usuários com acesso ao sistema' : ''}
        </p>
      </div>

      <ConfiguracoesTabs isAdmin={isAdmin} />

      <div className="mt-4">{children}</div>
    </div>
  )
}
