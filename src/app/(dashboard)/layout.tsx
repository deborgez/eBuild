// src/app/(dashboard)/layout.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Sidebar user={session.user} />
      <main className="flex-1 overflow-auto p-8" style={{ backgroundColor: 'var(--color-bg)' }}>
        {children}
      </main>
    </div>
  )
}
