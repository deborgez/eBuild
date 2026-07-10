'use client'
// src/components/dashboard/documentos-etapa.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileViewer } from '@/components/ui/file-viewer'

interface Documento {
  id: string
  nome: string
  url: string
}

export function DocumentosEtapa({ etapaId, documentos }: { etapaId: string; documentos: Documento[] }) {
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
      await fetch(`/api/etapas/${etapaId}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: arquivo.name, url }),
      })
    }

    setEnviando(false)
    router.refresh()
  }

  async function handleRemover(documentoId: string) {
    if (!confirm('Remover este documento?')) return
    setRemovendoId(documentoId)
    await fetch(`/api/documentos-etapa/${documentoId}`, { method: 'DELETE' })
    setRemovendoId(null)
    router.refresh()
  }

  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
          📁 Documentos da etapa {documentos.length > 0 && `(${documentos.length})`}
        </p>
        <label className="btn-secondary text-xs py-1 px-2 cursor-pointer">
          {enviando ? 'Enviando...' : '+ Adicionar documento'}
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" className="hidden" onChange={handleUpload} disabled={enviando} />
        </label>
      </div>

      {documentos.length > 0 && (
        <div className="space-y-1 mt-2">
          {documentos.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
              style={{ backgroundColor: 'var(--color-bg-header)' }}>
              <FileViewer url={d.url} nome={d.nome}>
                <span className="text-xs cursor-pointer hover:underline truncate" style={{ color: 'var(--color-brand)' }}>
                  📄 {d.nome}
                </span>
              </FileViewer>
              <button
                onClick={() => handleRemover(d.id)}
                disabled={removendoId === d.id}
                className="text-xs px-1.5 py-0.5 rounded text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                title="Remover documento"
              >
                {removendoId === d.id ? '...' : '✕'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
