'use client'
// src/components/ui/file-viewer.tsx
// Popup universal para visualizar qualquer arquivo sem abrir nova aba

import { useState } from 'react'

interface FileViewerProps {
  url: string
  nome?: string
  children: React.ReactNode
}

function getFileType(url: string): 'pdf' | 'image' | 'office' | 'other' {
  const u = url.toLowerCase().split('?')[0]
  if (u.endsWith('.pdf')) return 'pdf'
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(u)) return 'image'
  if (/\.(doc|docx|xls|xlsx|ppt|pptx)$/.test(u)) return 'office'
  return 'other'
}

function getFileIcon(type: string) {
  if (type === 'pdf') return '📄'
  if (type === 'image') return '🖼️'
  if (type === 'office') return '📝'
  return '📁'
}

export function FileViewer({ url, nome, children }: FileViewerProps) {
  const [aberto, setAberto] = useState(false)
  const tipo = getFileType(url)
  const nomeArquivo = nome ?? decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'arquivo')

  return (
    <>
      <span
        onClick={(e) => { e.stopPropagation(); setAberto(true) }}
        className="cursor-pointer"
      >
        {children}
      </span>

      {aberto && (
        <div
          className="file-popup-overlay"
          onClick={() => setAberto(false)}
          style={{ zIndex: 9999 }}
        >
          <div
            className="file-popup-container"
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 flex-shrink-0"
              style={{
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-bg-header)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">{getFileIcon(tipo)}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {nomeArquivo}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {tipo === 'pdf' ? 'Documento PDF'
                      : tipo === 'image' ? 'Imagem'
                      : tipo === 'office' ? 'Documento Office'
                      : 'Arquivo'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <a
                  href={url}
                  download={nomeArquivo}
                  onClick={(e) => e.stopPropagation()}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  ⬇ Baixar
                </a>
                <button
                  onClick={() => setAberto(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-lg font-bold"
                  style={{ color: 'var(--color-text-muted)' }}
                  title="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
              {tipo === 'pdf' && (
                <iframe
                  src={url}
                  className="w-full"
                  style={{ height: 'calc(90vh - 64px)', border: 'none', display: 'block' }}
                  title={nomeArquivo}
                />
              )}

              {tipo === 'image' && (
                <div
                  className="flex items-center justify-center p-6"
                  style={{
                    minHeight: 'calc(90vh - 64px)',
                    backgroundColor: 'var(--color-bg-header)',
                  }}
                >
                  <img
                    src={url}
                    alt={nomeArquivo}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 'calc(90vh - 120px)',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              )}

              {tipo === 'office' && (
                <div className="flex flex-col items-center justify-center py-16 px-8"
                  style={{ minHeight: 'calc(90vh - 64px)', backgroundColor: 'var(--color-bg-header)' }}>
                  <span className="text-6xl mb-4">📝</span>
                  <p className="font-semibold mb-2 text-center" style={{ color: 'var(--color-text-primary)' }}>
                    {nomeArquivo}
                  </p>
                  <p className="text-sm mb-2 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Documentos Word/Excel não podem ser visualizados diretamente.
                  </p>
                  <p className="text-xs mb-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Clique em "Baixar" para abrir no seu computador.
                  </p>
                  <a href={url} download={nomeArquivo}
                    className="btn-primary">
                    ⬇ Baixar arquivo
                  </a>
                </div>
              )}

              {tipo === 'other' && (
                <div className="flex flex-col items-center justify-center py-16 px-8"
                  style={{ minHeight: 'calc(90vh - 64px)', backgroundColor: 'var(--color-bg-header)' }}>
                  <span className="text-6xl mb-4">📁</span>
                  <p className="font-semibold mb-2 text-center" style={{ color: 'var(--color-text-primary)' }}>
                    {nomeArquivo}
                  </p>
                  <p className="text-sm mb-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Este tipo de arquivo não pode ser visualizado aqui.
                  </p>
                  <a href={url} download={nomeArquivo} className="btn-primary">
                    ⬇ Baixar arquivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
