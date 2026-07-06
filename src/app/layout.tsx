// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'eBuild — Gestão de Obras Civis',
  description: 'Sistema SaaS para gestão e administração de obras civis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="bg-concrete-50 font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
