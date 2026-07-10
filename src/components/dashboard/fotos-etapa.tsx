'use client'
// src/components/dashboard/fotos-etapa.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileViewer } from '@/components/ui/file-viewer'

interface Foto {
  id: string
  url: string
  descricao: string | null
}

export function FotosEtapa({ etapaId, fotos }: { etapaId: string; fotos: Foto[] }) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return

    setEnviando(true)
    const fd = new FormData()
    fd.append('file', arquivo)
    fd.append('etapaId', etapaId)
    const r = await fetch('/api/upload', { method: 'POST', body: fd })

    if (r.ok) {
      const { url } = await r.json()
      await fetch(`/api/etapas/${etapaId}/fotos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
    }

    setEnviando(false)
    router.refresh()
  }

  async function handleRemover(fotoId: string) {
    if (!confirm('Remover esta foto?')) return
    setRemovendoId(fotoId)
    await fetch(`/api/fotos-etapa/${fotoId}`, { method: 'DELETE' })
    setRemovendoId(null)
    router.refresh()
  }

  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          📷 Fotos da etapa {fotos.length > 0 && `(${fotos.length})`}
        </p>
        <label className="btn-secondary text-xs py-1 px-2 cursor-pointer">
          {enviando ? 'Enviando...' : '+ Adicionar foto'}
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={enviando} />
        </label>
      </div>

      {fotos.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {fotos.map((f) => (
            <div key={f.id} className="relative group" style={{ width: 72, height: 72 }}>
              <FileViewer url={f.url} nome={f.descricao ?? 'Foto da etapa'}>
                <img
                  src={f.url}
                  alt={f.descricao ?? 'Foto da etapa'}
                  className="w-full h-full object-cover rounded-lg border cursor-pointer"
                  style={{ borderColor: 'var(--color-border)' }}
                />
              </FileViewer>
              <button
                onClick={() => handleRemover(f.id)}
                disabled={removendoId === f.id}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs flex items-center justify-center bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remover foto"
              >
                {removendoId === f.id ? '...' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
