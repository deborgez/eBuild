'use client'
// src/app/(dashboard)/obras/[id]/relatorio/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'

interface RelatorioData {
  obra: {
    nome: string; endereco: string | null; areaM2: number; prazoMeses: number
    dataInicio: string | null; status: string
    cliente: { nome: string; email: string; whatsapp: string }
  }
  financeiro: any
  etapas: Array<{
    nome: string; descricao: string | null; percentualConclusao: number; percentualObra: number
    lancamentos: Array<{
      descricao: string; valor: number; status: string; tipo: string; fornecedor: string | null
      categoria: 'NORMAL' | 'CONTRATO' | 'BENFEITORIA' | 'ADMINISTRACAO' | 'ADMINISTRACAO_BENFEITORIA'
    }>
    fotos: Array<{ url: string; descricao: string | null }>
  }>
  contratos: Array<{ nome: string; fornecedor: string; valorTotal: number; valorPagoReal: number }>
  documentacao: Array<{ descricao: string; valor: number; fornecedor: string | null; comprovanteUrl: string | null }>
  benfeitorias: Array<{ descricao: string; valor: number; fornecedor: string | null; status: string; comprovanteUrl: string | null; etapaNome: string }>
}

const CATEGORIA_LABEL: Record<string, string> = {
  CONTRATO: '📋 Contrato',
  BENFEITORIA: '🏠 Benfeitoria',
  ADMINISTRACAO: '💼 Administração',
  ADMINISTRACAO_BENFEITORIA: '💼 Administração — Benfeitoria',
}
const CATEGORIA_COR: Record<string, string> = {
  CONTRATO: 'bg-purple-100 text-purple-700',
  BENFEITORIA: 'bg-purple-100 text-purple-700',
  ADMINISTRACAO: 'bg-indigo-100 text-indigo-700',
  ADMINISTRACAO_BENFEITORIA: 'bg-indigo-100 text-indigo-700',
}

export default function RelatorioObraPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [dados, setDados] = useState<RelatorioData | null>(null)
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todas')

  useEffect(() => {
    fetch(`/api/obras/${params.id}/relatorio`).then((r) => r.json()).then(setDados)
  }, [params.id])

  if (!dados) return (
    <div className="min-h-screen flex items-center justify-center">
      <p style={{ color: 'var(--color-text-muted)' }}>Carregando relatório...</p>
    </div>
  )

  const etapasFiltradas = filtroEtapa === 'todas' ? dados.etapas : dados.etapas.filter((e) => e.nome === filtroEtapa)

  return (
    <div className="min-h-screen py-6 px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-4xl mx-auto">

        {/* Controles — não imprime */}
        <div className="flex justify-between items-center mb-4 print:hidden">
          <button onClick={() => router.back()} className="btn-secondary text-sm">← Voltar</button>
          <div className="flex items-center gap-3">
            <select value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)} className="input text-sm w-48">
              <option value="todas">Relatório completo</option>
              {dados.etapas.map((e) => <option key={e.nome} value={e.nome}>{e.nome}</option>)}
            </select>
            <button onClick={() => window.print()} className="btn-primary text-sm">🖨️ Imprimir / PDF</button>
          </div>
        </div>

        <div id="relatorio-print" className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Cabeçalho */}
          <div className="bg-indigo-600 text-white p-6">
            <p className="text-indigo-200 text-xs uppercase tracking-wider font-semibold">eBuild</p>
            <h1 className="text-2xl font-bold mt-1">
              {filtroEtapa === 'todas' ? 'Relatório Final da Obra' : `Relatório — ${filtroEtapa}`}
            </h1>
            <p className="text-indigo-200 text-sm mt-2">{dados.obra.nome}</p>
            <p className="text-indigo-300 text-xs mt-1">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <div className="p-6 space-y-6">

            {/* Dados gerais */}
            <section>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                Dados da Obra
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-400">Cliente:</span> <span className="font-medium text-gray-900">{dados.obra.cliente.nome}</span></div>
                <div><span className="text-gray-400">Área:</span> <span className="font-medium text-gray-900">{dados.obra.areaM2} m²</span></div>
                <div><span className="text-gray-400">Endereço:</span> <span className="font-medium text-gray-900">{dados.obra.endereco ?? '—'}</span></div>
                <div><span className="text-gray-400">Prazo:</span> <span className="font-medium text-gray-900">{dados.obra.prazoMeses} meses</span></div>
                <div><span className="text-gray-400">Início:</span> <span className="font-medium text-gray-900">{dados.obra.dataInicio ? formatDate(dados.obra.dataInicio) : '—'}</span></div>
                <div><span className="text-gray-400">Status:</span> <span className="font-medium text-gray-900">{dados.obra.status}</span></div>
              </div>
            </section>

            {/* Resumo financeiro */}
            <section>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                Resumo Financeiro
              </h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Custo total da obra</p>
                  <p className="font-bold text-gray-900 mt-1">{formatCurrency(dados.financeiro.custoObra)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Total pago</p>
                  <p className="font-bold text-green-600 mt-1">{formatCurrency(dados.financeiro.totalPago)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Custo real/m²</p>
                  <p className="font-bold text-gray-900 mt-1">{formatCurrency(dados.financeiro.custoRealM2)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Referência/m²</p>
                  <p className="font-bold text-gray-900 mt-1">{formatCurrency(dados.financeiro.referenciaM2)}</p>
                </div>
                {dados.financeiro.administracaoTotal !== null && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Administração já recebida</p>
                    <p className="font-bold text-green-600 mt-1">{formatCurrency(dados.financeiro.taxaAdminPaga)}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Contratos globais */}
            {dados.contratos.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                  Contratos Globais
                </h2>
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: '35%' }} /><col style={{ width: '25%' }} />
                    <col style={{ width: '20%' }} /><col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="pb-2">Contrato</th><th className="pb-2">Fornecedor</th>
                      <th className="pb-2 text-right">Total</th><th className="pb-2 text-right">Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dados.contratos.map((c, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-900 truncate">{c.nome}</td>
                        <td className="py-2 text-gray-500 truncate">{c.fornecedor}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(c.valorTotal)}</td>
                        <td className="py-2 text-right text-green-600">{formatCurrency(c.valorPagoReal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Etapas */}
            <section>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                {filtroEtapa === 'todas' ? 'Cronograma e Lançamentos' : 'Lançamentos da Etapa'}
              </h2>
              {etapasFiltradas.map((etapa, i) => {
                const totalPagoEtapa = etapa.lancamentos.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
                const grupos = [
                  { titulo: 'Da etapa', itens: etapa.lancamentos.filter((l) => l.categoria === 'NORMAL' || l.categoria === 'ADMINISTRACAO') },
                  { titulo: 'Contrato', itens: etapa.lancamentos.filter((l) => l.categoria === 'CONTRATO') },
                  { titulo: 'Benfeitoria', itens: etapa.lancamentos.filter((l) => l.categoria === 'BENFEITORIA' || l.categoria === 'ADMINISTRACAO_BENFEITORIA') },
                ].filter((g) => g.itens.length > 0)
                return (
                <div key={i} className="mb-5 last:mb-0">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-semibold text-gray-900">{etapa.nome}</p>
                    <span className="text-xs text-gray-500">{etapa.percentualConclusao.toFixed(0)}% concluída · {etapa.percentualObra}% da obra</span>
                  </div>
                  {etapa.descricao && <p className="text-xs text-gray-500 mb-2">{etapa.descricao}</p>}
                  {etapa.lancamentos.length > 0 ? (
                    <>
                      {grupos.map((grupo, g) => {
                        const totalGrupo = grupo.itens.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
                        return (
                          <div key={grupo.titulo} className={g > 0 ? 'mt-3 pt-3 border-t border-dashed border-gray-300' : ''}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">{grupo.titulo}</p>
                            <table className="w-full text-sm table-fixed">
                              <colgroup>
                                <col style={{ width: '45%' }} /><col style={{ width: '20%' }} />
                                <col style={{ width: '20%' }} /><col style={{ width: '15%' }} />
                              </colgroup>
                              <tbody className="divide-y divide-gray-100">
                                {grupo.itens.map((l, j) => (
                                  <tr key={j}>
                                    <td className="py-1.5 text-gray-700 truncate">
                                      {l.descricao}
                                      {CATEGORIA_LABEL[l.categoria] && (
                                        <span className={`ml-1.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${CATEGORIA_COR[l.categoria]}`}>
                                          {CATEGORIA_LABEL[l.categoria]}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-1.5 text-gray-400 text-xs truncate">{l.fornecedor ?? '—'}</td>
                                    <td className="py-1.5 text-right font-medium text-gray-900">{formatCurrency(l.valor)}</td>
                                    <td className="py-1.5 text-right text-xs text-gray-400">{l.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-gray-200">
                                  <td colSpan={2} className="pt-1 text-xs text-gray-400">Pago — {grupo.titulo.toLowerCase()}</td>
                                  <td className="pt-1 text-right text-xs font-semibold text-green-600">{formatCurrency(totalGrupo)}</td>
                                  <td className="pt-1"></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )
                      })}
                      <div className="mt-3 pt-2 border-t-2 border-gray-300 flex justify-between">
                        <span className="text-xs font-semibold text-gray-500">Total pago da etapa</span>
                        <span className="text-sm font-bold text-green-600">{formatCurrency(totalPagoEtapa)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400">Nenhum lançamento.</p>
                  )}
                  {etapa.fotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {etapa.fotos.map((f, k) => (
                        <a key={k} href={f.url} target="_blank" rel="noopener noreferrer" title={f.descricao ?? undefined}>
                          <img src={f.url} alt={f.descricao ?? `Foto ${k + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )})}
            </section>

            {/* Documentação — só no relatório completo */}
            {filtroEtapa === 'todas' && dados.documentacao.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                  Documentação / Taxas Extras
                </h2>
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: '55%' }} /><col style={{ width: '25%' }} /><col style={{ width: '20%' }} />
                  </colgroup>
                  <tbody className="divide-y divide-gray-100">
                    {dados.documentacao.map((d, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-gray-700 truncate">{d.descricao}</td>
                        <td className="py-1.5 text-gray-400 text-xs truncate">{d.fornecedor ?? '—'}</td>
                        <td className="py-1.5 text-right font-medium text-gray-900">{formatCurrency(d.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Benfeitorias — só no relatório completo */}
            {filtroEtapa === 'todas' && dados.benfeitorias.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                  Benfeitorias (valores à parte)
                </h2>
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: '35%' }} /><col style={{ width: '20%' }} />
                    <col style={{ width: '25%' }} /><col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-gray-400 text-xs">
                      <th className="pb-2">Descrição</th><th className="pb-2">Etapa</th>
                      <th className="pb-2">Fornecedor</th><th className="pb-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dados.benfeitorias.map((b, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-gray-700 truncate">{b.descricao}</td>
                        <td className="py-1.5 text-gray-400 text-xs truncate">{b.etapaNome}</td>
                        <td className="py-1.5 text-gray-400 text-xs truncate">{b.fornecedor ?? '—'}</td>
                        <td className="py-1.5 text-right font-medium text-gray-900">{formatCurrency(b.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Rodapé */}
            <div className="pt-6 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-400">Relatório gerado automaticamente pelo eBuild</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #relatorio-print, #relatorio-print * { visibility: visible; }
          #relatorio-print { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}
