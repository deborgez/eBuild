'use client'
// src/components/dashboard/recibo-modal.tsx
// Popup do recibo de pagamento (taxa de administração / equalização), no mesmo
// padrão visual do FileViewer — nunca navega para outra página.

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, valorPorExtenso, formatCpfCnpj } from '@/lib/utils'

interface Fatura {
  id: string; baseCalculo: number; taxaPct: number; valorTaxa: number
  equalizacaoValor: number | null; tipoEqualizacao: string | null
  status: string; createdAt: string
  etapa: { nome: string } | null
  obra: { nome: string; endereco: string | null; cliente: { nome: string; cpfCnpj: string | null } }
  administradora: { empresa: string | null; cnpj: string | null } | null
}

export function ReciboModal({ faturaId, children }: { faturaId: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false)
  const [fatura, setFatura] = useState<Fatura | null>(null)

  useEffect(() => {
    if (!aberto) return
    setFatura(null)
    fetch(`/api/faturas/${faturaId}`).then((r) => r.json()).then(setFatura)
  }, [aberto, faturaId])

  const ehTaxa = fatura?.etapa != null
  const numeroRecibo = fatura ? `REC-${fatura.id.slice(0, 8).toUpperCase()}` : ''

  return (
    <>
      <span onClick={(e) => { e.stopPropagation(); setAberto(true) }} className="cursor-pointer">
        {children}
      </span>

      {aberto && (
        <div className="file-popup-overlay" onClick={() => setAberto(false)} style={{ zIndex: 9999 }}>
          <div className="file-popup-container" onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', maxWidth: '640px' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 print:hidden"
              style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-header)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">🧾</span>
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                  Recibo de pagamento
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                {fatura && (
                  <button onClick={() => window.print()} className="btn-primary text-xs py-1.5 px-3">
                    🖨️ Imprimir / Salvar PDF
                  </button>
                )}
                <button onClick={() => setAberto(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-lg font-bold"
                  style={{ color: 'var(--color-text-muted)' }} title="Fechar">
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-auto" style={{ minHeight: 0, backgroundColor: 'var(--color-bg-header)' }}>
              {!fatura ? (
                <div className="flex items-center justify-center py-16" style={{ color: 'var(--color-text-muted)' }}>
                  Carregando recibo...
                </div>
              ) : (
                <div className="p-4">
                  <div id="recibo-print" className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    {/* Cabeçalho */}
                    <div className="bg-indigo-600 text-white p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-indigo-200 text-xs uppercase tracking-wider font-semibold">eBuild</p>
                          <h1 className="text-xl font-bold mt-1">Recibo de Pagamento</h1>
                        </div>
                        <div className="text-right">
                          <p className="text-indigo-200 text-xs">Nº do recibo</p>
                          <p className="font-mono font-bold">{numeroRecibo}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Texto de declaração */}
                      <p className="text-sm leading-relaxed text-gray-800 text-justify">
                        A <strong>{fatura.administradora?.empresa || '[Empresa não configurada — edite seu perfil]'}</strong>,
                        inscrita no CNPJ nº <strong>{fatura.administradora?.cnpj || '[CNPJ não informado]'}</strong>, declara,
                        para os devidos fins, que recebeu de <strong>{fatura.obra.cliente.nome}</strong>, inscrita no CPF nº{' '}
                        <strong>{fatura.obra.cliente.cpfCnpj ? formatCpfCnpj(fatura.obra.cliente.cpfCnpj) : '[CPF não informado]'}</strong>,
                        a importância de{' '}
                        <strong>{formatCurrency(ehTaxa ? fatura.valorTaxa : Math.abs(fatura.equalizacaoValor ?? 0))}</strong>{' '}
                        ({valorPorExtenso(ehTaxa ? fatura.valorTaxa : Math.abs(fatura.equalizacaoValor ?? 0))}),
                        referente {ehTaxa
                          ? <>à taxa de administração correspondente a <strong>{fatura.taxaPct}%</strong> da <strong>{fatura.etapa?.nome}</strong> da obra "{fatura.obra.nome}"</>
                          : <>{fatura.tipoEqualizacao === 'BONUS' ? 'ao bônus de eficiência' : 'ao ressarcimento'} da equalização final da obra "{fatura.obra.nome}"</>
                        }.
                      </p>

                      <p className="text-sm leading-relaxed text-gray-800 text-justify">
                        E, por ser expressão da verdade, firma a presente declaração para os fins que se fizerem necessários.
                      </p>

                      {/* Valor */}
                      <div className="bg-indigo-50 rounded-xl p-5 text-center">
                        <p className="text-xs text-indigo-600 uppercase font-semibold tracking-wider">Valor</p>
                        <p className="text-3xl font-bold text-indigo-900 mt-1">
                          {formatCurrency(ehTaxa ? fatura.valorTaxa : Math.abs(fatura.equalizacaoValor ?? 0))}
                        </p>
                        <p className="text-xs text-indigo-500 mt-2">
                          Emitido em {formatDate(fatura.createdAt)} · Status: {fatura.status === 'PAGA' ? 'Pago' : 'Pendente'}
                        </p>
                      </div>

                      {/* Assinatura */}
                      <div className="pt-6 flex justify-center text-center">
                        <div className="w-64">
                          <div className="border-t border-gray-300 pt-2">
                            <p className="text-sm font-medium text-gray-900">
                              {fatura.administradora?.empresa || 'Administradora'}
                            </p>
                            <p className="text-xs text-gray-500">Assinatura da administradora</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #recibo-print, #recibo-print * { visibility: visible; }
          #recibo-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </>
  )
}
