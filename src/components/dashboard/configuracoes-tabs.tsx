'use client'
// src/components/dashboard/configuracoes-tabs.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function ConfiguracoesTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  const tabs = [
    { href: '/configuracoes/perfil', label: 'Perfil' },
    ...(isAdmin ? [{ href: '/configuracoes/usuarios', label: 'Usuários' }] : []),
  ]

  return (
    <div className="border-b flex gap-1" style={{ borderColor: 'var(--color-border)' }}>
      {tabs.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link key={tab.href} href={tab.href}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors')}
            style={{
              borderColor: active ? 'var(--color-brand)' : 'transparent',
              color: active ? 'var(--color-brand)' : 'var(--color-text-muted)',
            }}>
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
