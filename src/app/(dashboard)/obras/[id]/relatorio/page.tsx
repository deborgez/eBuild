'use client'
// src/app/(dashboard)/obras/[id]/relatorio/page.tsx
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { formatCurrency, formatDate, formatPercent, STATUS_LABELS } from '@/lib/utils'
import { PrazoIndicador } from '@/components/dashboard/prazo-indicador'
import { cn } from '@/lib/utils'

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
  contratos: Array<{ nome: string; fornecedor: string; valorTotal: number; valorPagoReal: number; valorComprometido: number; saldoRestante: number }>
  documentacao: Array<{ descricao: string; valor: number; fornecedor: string | null; comprovanteUrl: string | null }>
  benfeitorias: Array<{ descricao: string; valor: number; fornecedor: string | null; status: string; comprovanteUrl: string | null; etapaNome: string }>
}

const CATEGORIA_LABEL: Record<string, string> = {
  CONTRATO: '📋 Contrato',
  BENFEITORIA: '🏠 Benfeitoria',
  ADMINISTRACAO: '💼 Administração',
  ADMINISTRACAO_BENFEITORIA: '💼 Adm. benfeitoria',
}
const CATEGORIA_COR: Record<string, string> = {
  CONTRATO: 'bg-purple-100 text-purple-700',
  BENFEITORIA: 'bg-purple-100 text-purple-700',
  ADMINISTRACAO: 'bg-indigo-100 text-indigo-700',
  ADMINISTRACAO_BENFEITORIA: 'bg-indigo-100 text-indigo-700',
}

// Exibe a foto grande o bastante pra dar pra entender a cena, na proporção 16:9 (paisagem)
// ou 9:16 (retrato) conforme a orientação real da imagem — detectada quando ela carrega.
function FotoRelatorio({ url, alt }: { url: string; alt: string }) {
  const [paisagem, setPaisagem] = useState(true)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={alt}
      className="block w-full rounded-lg overflow-hidden border border-gray-200"
      style={{ aspectRatio: paisagem ? '16 / 9' : '9 / 16' }}>
      <img
        src={url}
        alt={alt}
        onLoad={(e) => setPaisagem(e.currentTarget.naturalWidth >= e.currentTarget.naturalHeight)}
        className="w-full h-full object-cover"
      />
    </a>
  )
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
                <div><span className="text-gray-400">Status:</span> <span className="font-medium text-gray-900">{STATUS_LABELS[dados.obra.status] ?? dados.obra.status}</span></div>
              </div>
            </section>

            {/* Prazo */}
            {dados.obra.dataInicio && dados.obra.status !== 'ENCERRADA' && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                  Prazo
                </h2>
                <PrazoIndicador dataInicio={dados.obra.dataInicio} prazoMeses={dados.obra.prazoMeses} status={dados.obra.status} />
              </section>
            )}

            {/* Progresso geral da obra */}
            {dados.etapas.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                  Progresso Geral da Obra
                </h2>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">Progresso</span>
                    <span className={cn('text-lg font-bold', (dados.financeiro.progressoGeral ?? 0) >= 100 ? 'text-green-600' : 'text-indigo-600')}>
                      {(dados.financeiro.progressoGeral ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="rounded-full h-2.5 bg-gray-200">
                    <div className={cn('h-2.5 rounded-full', (dados.financeiro.progressoGeral ?? 0) >= 100 ? 'bg-green-500' : 'bg-indigo-500')}
                      style={{ width: `${Math.min(dados.financeiro.progressoGeral ?? 0, 100)}%` }} />
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {dados.etapas.map((e, i) => (
                      <span key={i} className="text-[9px] text-gray-500 whitespace-nowrap">
                        {e.nome}: {e.percentualConclusao.toFixed(0)}%{e.percentualObra > 0 ? ` (${e.percentualObra}%)` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Resumo financeiro */}
            <section>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                Resumo Financeiro
              </h2>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Custo total da obra</p>
                  <p className="font-bold text-gray-900 mt-1">{formatCurrency(dados.financeiro.custoObra)}</p>
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-0.5">
                    <div>Material: <span className="font-semibold text-gray-900">{formatCurrency(dados.financeiro.custoMaterial)}</span></div>
                    <div>Mão de obra: <span className="font-semibold text-gray-900">{formatCurrency(dados.financeiro.custoMaoDeObra)}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Total pago</p>
                  <p className="font-bold text-green-600 mt-1">{formatCurrency(dados.financeiro.totalPago)}</p>
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-0.5">
                    <div>Material: <span className="font-semibold text-gray-900">{formatCurrency(dados.financeiro.totalPagoMaterial)}</span></div>
                    <div>Mão de obra: <span className="font-semibold text-gray-900">{formatCurrency(dados.financeiro.totalPagoMaoDeObra)}</span></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Custo real/m²</p>
                  <p className="font-bold text-gray-900 mt-1">{formatCurrency(dados.financeiro.custoRealM2)}</p>
                  {dados.financeiro.custoObra > 0 && (
                    <p className={cn('text-xs font-medium mt-2 pt-2 border-t border-gray-200',
                      dados.financeiro.diferencaM2 > 0 ? 'text-red-600' : 'text-green-600')}>
                      {dados.financeiro.diferencaM2 > 0 ? '▲' : '▼'} {formatCurrency(Math.abs(dados.financeiro.diferencaM2))}/m² {dados.financeiro.diferencaM2 > 0 ? 'acima' : 'abaixo'} do esperado
                    </p>
                  )}
                </div>
              </div>

              {/* Saldo da obra (equalização) */}
              {dados.financeiro.custoObra > 0 && dados.financeiro.tendenciaEqualizacao !== 'EQUILIBRADO' && (
                <div className={cn('mt-3 rounded-lg p-3 border-l-4',
                  dados.financeiro.tendenciaEqualizacao === 'POSITIVO' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50')}>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Saldo da obra (projeção)</p>
                  <p className={cn('text-lg font-bold mt-1', dados.financeiro.tendenciaEqualizacao === 'POSITIVO' ? 'text-green-600' : 'text-red-600')}>
                    {dados.financeiro.tendenciaEqualizacao === 'POSITIVO' ? '+' : '-'}{formatCurrency(dados.financeiro.projecaoEqualizacao)}
                  </p>
                </div>
              )}
            </section>

            {/* Contratos globais com pagamento */}
            {dados.contratos.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">
                  Saldo dos Contratos Globais (com pagamento)
                </h2>
                <table className="w-full text-xs table-fixed">
                  <colgroup>
                    <col style={{ width: '28%' }} /><col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="pb-2">Contrato</th><th className="pb-2">Fornecedor</th>
                      <th className="pb-2 text-right">Comprometido</th><th className="pb-2 text-right">Pago</th>
                      <th className="pb-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dados.contratos.map((c, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-2 text-gray-900 truncate">{c.nome}</td>
                        <td className="py-2 pr-2 text-gray-500 truncate">{c.fornecedor}</td>
                        <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(c.valorComprometido)}</td>
                        <td className="py-2 text-right text-green-600">{formatCurrency(c.valorPagoReal)}</td>
                        <td className={cn('py-2 text-right font-medium', c.saldoRestante < 0 ? 'text-red-600' : 'text-gray-900')}>
                          {formatCurrency(c.saldoRestante)}
                        </td>
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
                // A taxa de administração (base ou de benfeitoria) sempre aparece por último
                // dentro do seu grupo, já que é cobrada sobre o que veio antes.
                const porUltimoSeTaxa = (a: { categoria: string }, b: { categoria: string }) => {
                  const aEhTaxa = a.categoria === 'ADMINISTRACAO' || a.categoria === 'ADMINISTRACAO_BENFEITORIA'
                  const bEhTaxa = b.categoria === 'ADMINISTRACAO' || b.categoria === 'ADMINISTRACAO_BENFEITORIA'
                  return (aEhTaxa ? 1 : 0) - (bEhTaxa ? 1 : 0)
                }
                const grupos = [
                  { titulo: 'Da etapa', itens: etapa.lancamentos.filter((l) => l.categoria === 'NORMAL' || l.categoria === 'ADMINISTRACAO').sort(porUltimoSeTaxa) },
                  { titulo: 'Contrato', itens: etapa.lancamentos.filter((l) => l.categoria === 'CONTRATO') },
                  { titulo: 'Benfeitoria', itens: etapa.lancamentos.filter((l) => l.categoria === 'BENFEITORIA' || l.categoria === 'ADMINISTRACAO_BENFEITORIA').sort(porUltimoSeTaxa) },
                ].filter((g) => g.itens.length > 0)
                return (
                <div key={i} className="mb-5 last:mb-0 break-inside-avoid">
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
                          <div key={grupo.titulo} className={cn('break-inside-avoid', g > 0 ? 'mt-6 pt-4 border-t border-dashed border-gray-300' : '')}>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{grupo.titulo}</p>
                            <table className="w-full text-xs table-fixed">
                              <colgroup>
                                <col style={{ width: '48%' }} /><col style={{ width: '19%' }} />
                                <col style={{ width: '20%' }} /><col style={{ width: '13%' }} />
                              </colgroup>
                              <tbody className="divide-y divide-gray-100">
                                {grupo.itens.map((l, j) => (
                                  <tr key={j}>
                                    <td className="py-1.5 pr-2 text-gray-700 truncate">
                                      {l.descricao}
                                      {CATEGORIA_LABEL[l.categoria] && (
                                        <span className={`ml-1 inline-block text-[9px] font-medium px-1 py-0.5 rounded ${CATEGORIA_COR[l.categoria]}`}>
                                          {CATEGORIA_LABEL[l.categoria]}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-1.5 pr-2 text-gray-400 truncate">
                                      {l.fornecedor ?? '—'}
                                      <span className="block text-[9px] text-gray-400">{STATUS_LABELS[l.tipo] ?? l.tipo}</span>
                                    </td>
                                    <td className="py-1.5 text-right font-medium text-gray-900">{formatCurrency(l.valor)}</td>
                                    <td className="py-1.5 text-right text-gray-400">{l.status}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-gray-200">
                                  <td colSpan={2} className="pt-1 text-gray-400">Pago — {grupo.titulo.toLowerCase()}</td>
                                  <td className="pt-1 text-right font-semibold text-green-600">{formatCurrency(totalGrupo)}</td>
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
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {etapa.fotos.map((f, k) => (
                        <FotoRelatorio key={k} url={f.url} alt={f.descricao ?? `Foto ${k + 1}`} />
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
                <table className="w-full text-xs table-fixed">
                  <colgroup>
                    <col style={{ width: '55%' }} /><col style={{ width: '25%' }} /><col style={{ width: '20%' }} />
                  </colgroup>
                  <tbody className="divide-y divide-gray-100">
                    {dados.documentacao.map((d, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-2 text-gray-700 truncate">{d.descricao}</td>
                        <td className="py-1.5 pr-2 text-gray-400 truncate">{d.fornecedor ?? '—'}</td>
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
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Total de benfeitorias</p>
                    <p className="font-bold text-gray-900 mt-1">{formatCurrency(dados.financeiro.benfeitorias.custoTotal)}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-0.5">
                      <div>Material: <span className="font-semibold text-gray-900">{formatCurrency(dados.financeiro.benfeitorias.materialPago)}</span></div>
                      <div>Mão de obra: <span className="font-semibold text-gray-900">{formatCurrency(dados.financeiro.benfeitorias.maoDeObraPago)}</span></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Pago</p>
                    <p className="font-bold text-green-600 mt-1">{formatCurrency(dados.financeiro.benfeitorias.pago)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatPercent(dados.financeiro.benfeitorias.percentualPago)} do total
                    </p>
                  </div>
                </div>
                <table className="w-full text-xs table-fixed">
                  <colgroup>
                    <col style={{ width: '35%' }} /><col style={{ width: '20%' }} />
                    <col style={{ width: '25%' }} /><col style={{ width: '20%' }} />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="pb-2">Descrição</th><th className="pb-2">Etapa</th>
                      <th className="pb-2">Fornecedor</th><th className="pb-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dados.benfeitorias.map((b, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pr-2 text-gray-700 truncate">{b.descricao}</td>
                        <td className="py-1.5 pr-2 text-gray-400 truncate">{b.etapaNome}</td>
                        <td className="py-1.5 pr-2 text-gray-400 truncate">{b.fornecedor ?? '—'}</td>
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

          /* Evita que blocos (etapa, grupo de lançamentos, cards, fotos) sejam cortados
             ao virar a página — se não couber inteiro, empurra pra próxima página. */
          .break-inside-avoid,
          section,
          table,
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          h2 {
            break-after: avoid;
            page-break-after: avoid;
          }
        }
      `}</style>
    </div>
  )
}
