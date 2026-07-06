'use client'
// src/components/dashboard/anexar-foto-modal.tsx
import { useState } from 'react'

export function AnexarFotoModal({ lancamentoId, onSalvo }: { lancamentoId: string; onSalvo: () => void }) {
  const [aberto, setAberto] = useState(false)
  const [modo, setModo] = useState<'upload' | 'link'>('upload')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSalvar() {
    setLoading(true)
    let fotoUrl: string | undefined

    if (modo === 'upload' && arquivo) {
      const fd = new FormData()
      fd.append('file', arquivo)
      fd.append('lancamentoId', lancamentoId)
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      if (r.ok) fotoUrl = (await r.json()).url
    } else if (modo === 'link' && link.trim()) {
      fotoUrl = link.trim()
    }

    if (fotoUrl) {
      await fetch(`/api/lancamentos/${lancamentoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fotoUrl }),
      })
    }

    setLoading(false)
    setAberto(false)
    setArquivo(null)
    setLink('')
    onSalvo()
  }

  return (
    <>
      <button onClick={() => setAberto(true)} className="btn-secondary text-xs py-1 px-2" title="Anexar foto">
        📷
      </button>

      {aberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setAberto(false)}>
          <div className="rounded-2xl shadow-2xl w-full max-w-sm p-5"
            style={{ backgroundColor: 'var(--color-bg-card)' }}
            onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--color-text-primary)' }}>
              📷 Anexar foto / comprovante
            </h3>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setModo('upload')}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: modo === 'upload' ? 'var(--color-brand)' : 'var(--color-bg-header)',
                  color: modo === 'upload' ? '#fff' : 'var(--color-text-secondary)',
                }}>
                📤 Upload
              </button>
              <button onClick={() => setModo('link')}
                className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: modo === 'link' ? 'var(--color-brand)' : 'var(--color-bg-header)',
                  color: modo === 'link' ? '#fff' : 'var(--color-text-secondary)',
                }}>
                🔗 Link
              </button>
            </div>

            {modo === 'upload' ? (
              <input type="file" accept="image/*,.pdf"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700"
                style={{ color: 'var(--color-text-muted)' }} />
            ) : (
              <input type="url" value={link} onChange={(e) => setLink(e.target.value)}
                placeholder="https://..." className="input" />
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={handleSalvar} disabled={loading || (!arquivo && !link.trim())}
                className="btn-primary text-sm flex-1 justify-center">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setAberto(false)} className="btn-secondary text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
