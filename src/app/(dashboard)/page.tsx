// src/app/(dashboard)/page.tsx
// Redireciona a raiz "/" para o dashboard
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
