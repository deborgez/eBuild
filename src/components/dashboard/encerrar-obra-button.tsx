'use client'
// src/components/dashboard/encerrar-obra-button.tsx
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function EncerrarObraButton({ obraId }: { obraId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleEncerrar() {
    if (!confirm('Encerrar a obra irá calcular a equalização final. Confirmar?')) return
    setLoading(true)
    await fetch(`/api/obras/${obraId}/encerrar`, { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleEncerrar}
      disabled={loading}
      className="btn-secondary text-amber-700 border-amber-300 hover:bg-amber-50"
    >
      {loading ? 'Encerrando...' : 'Encerrar obra'}
    </button>
  )
}
