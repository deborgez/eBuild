'use client'
// src/app/aprovacao/[token]/page.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

type Estado = 'carregando' | 'pronto' | 'processando' | 'aprovado' | 'reprovado' | 'erro' | 'expirado' | 'usado'

interface Orcamento {
  id: string; fornecedor: string; valor: number
  descricao: string | null; arquivoUrl: string | null; ordem: number; escolhido: boolean
}

interface DadosLancamento {
  id: string; descricao: string; tipo: string; valor: number
  fornecedor: string | null; comprovanteUrl: string | null; observacoes: string | null
  modoComparativo: boolean; orcamentos: Orcamento[]
  etapa: { nome: string; eDocumentacao: boolean }
  obra: { nome: string; endereco: string | null; cliente: { nome: string } }
}

interface ResultadoAprovacao {
  acao: string
  dataHora: string
  ipCliente: string | null
  orcamentoEscolhido: { fornecedor: string; valor: number } | null
}

export default function AprovacaoPage() {
  const { token } = useParams<{ token: string }>()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [dados, setDados] = useState<DadosLancamento | null>(null)
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoAprovacao | null>(null)
  const [erroMsg, setErroMsg] = useState('')
  const [gerandoPdf, setGerandoPdf] = useState(false)

  useEffect(() => {
    fetch(`/api/aprovacao/${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (res.status === 401) { setEstado('expirado'); return }
        if (res.status === 410) { setEstado('usado'); return }
        if (!res.ok) { setErroMsg(data.error || 'Erro'); setEstado('erro'); return }
        setDados(data)
        setEstado('pronto')
      })
      .catch(() => setEstado('erro'))
  }, [token])

  async function processar(acao: 'APROVADO' | 'REPROVADO') {
    if (acao === 'APROVADO' && dados?.modoComparativo && !orcamentoSelecionado) {
      setErroMsg('Selecione um orçamento antes de aprovar.')
      return
    }
    setErroMsg('')
    setEstado('processando')

    const res = await fetch(`/api/aprovacao/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao, orcamentoId: orcamentoSelecionado }),
    })
    const data = await res.json()
    if (!res.ok) { setErroMsg(data.error || 'Erro'); setEstado('pronto'); return }

    setResultado({
      acao,
      dataHora: new Date().toLocaleString('pt-BR'),
      ipCliente: data.ipCliente ?? null,
      orcamentoEscolhido: data.orcamentoEscolhido ?? null,
    })
    setEstado(acao === 'APROVADO' ? 'aprovado' : 'reprovado')
  }

  async function gerarComprovantePdf() {
    setGerandoPdf(true)
    // Abre janela de impressão do navegador formatada como comprovante
    window.print()
    setGerandoPdf(false)
  }

  if (estado === 'carregando') return (
    <PageShell>
      <div className="text-center py-16">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    </PageShell>
  )

  if (estado === 'expirado') return <PageShell><ResultCard icon="⏰" title="Link expirado" color="amber" message="Este link expirou. Solicite um novo à construtora." /></PageShell>
  if (estado === 'usado') return <PageShell><ResultCard icon="✓" title="Já respondido" color="blue" message="Você já respondeu este orçamento." /></PageShell>
  if (estado === 'erro') return <PageShell><ResultCard icon="✗" title="Erro" color="red" message={erroMsg || 'Erro inesperado.'} /></PageShell>

  // ── Comprovante de aprovação completo ──
  if ((estado === 'aprovado' || estado === 'reprovado') && resultado && dados) {
    const aprovado = estado === 'aprovado'
    return (
      <PageShell>
        <div id="comprovante-print">
          {/* Cabeçalho do comprovante */}
          <div className={`rounded-t-2xl p-6 text-center ${aprovado ? 'bg-green-600' : 'bg-red-600'} text-white`}>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl mx-auto mb-2">
              {aprovado ? '✓' : '✗'}
            </div>
            <h2 className="text-lg font-bold">{aprovado ? 'Orçamento Aprovado' : 'Orçamento Reprovado'}</h2>
            <p className="text-sm opacity-90 mt-1">Comprovante de aprovação</p>
          </div>

          {/* Corpo do comprovante */}
          <div className="bg-white border-x border-b border-gray-200 rounded-b-2xl p-5 space-y-4">

            {/* Dados da obra */}
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Obra</p>
              <p className="font-semibold text-gray-900">{dados.obra.nome}</p>
              {dados.obra.endereco && <p className="text-sm text-gray-500">{dados.obra.endereco}</p>}
              <p className="text-sm text-gray-500 mt-1">Cliente: {dados.obra.cliente.nome}</p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Etapa</p>
              <p className="text-sm text-gray-700">{dados.etapa.nome}</p>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Item aprovado</p>
              <p className="font-medium text-gray-900">{dados.descricao}</p>
            </div>

            {resultado.orcamentoEscolhido ? (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Fornecedor escolhido</p>
                <p className="font-medium text-gray-900">{resultado.orcamentoEscolhido.fornecedor}</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(resultado.orcamentoEscolhido.valor)}</p>
              </div>
            ) : (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Valor</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(dados.valor)}</p>
                {dados.fornecedor && <p className="text-sm text-gray-500">Fornecedor: {dados.fornecedor}</p>}
              </div>
            )}

            {/* Dados da aprovação — respaldo jurídico */}
            <div className="border-t border-gray-100 pt-4 bg-gray-50 -mx-5 px-5 py-4 rounded-b-2xl">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">Dados do registro</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Decisão</span>
                  <span className={`font-medium ${aprovado ? 'text-green-600' : 'text-red-600'}`}>
                    {aprovado ? 'Aprovado' : 'Reprovado'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Aprovado por</span>
                  <span className="font-medium text-gray-700">{dados.obra.cliente.nome}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Data e hora</span>
                  <span className="font-medium text-gray-700">{resultado.dataHora}</span>
                </div>
                {resultado.ipCliente && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Endereço IP</span>
                    <span className="font-mono text-xs text-gray-700">{resultado.ipCliente}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ações — não imprime */}
        <div className="mt-4 space-y-2 print:hidden">
          <button onClick={gerarComprovantePdf} disabled={gerandoPdf}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            📄 {gerandoPdf ? 'Gerando...' : 'Salvar / Imprimir comprovante'}
          </button>
          <p className="text-center text-xs text-gray-400">
            {aprovado
              ? 'A construtora foi notificada e dará continuidade ao serviço.'
              : 'A construtora foi notificada e entrará em contato.'}
          </p>
        </div>

        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            #comprovante-print, #comprovante-print * { visibility: visible; }
            #comprovante-print { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>
      </PageShell>
    )
  }

  if (!dados) return null

  // ── Tela de aprovação (igual antes) ──
  return (
    <PageShell>
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-600 px-6 py-8 rounded-2xl text-white mb-5">
        <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1">eBuild</p>
        <h1 className="text-xl font-bold">{dados.obra.nome}</h1>
        {dados.obra.endereco && <p className="text-indigo-200 text-sm mt-1">{dados.obra.endereco}</p>}
        <p className="text-indigo-100 text-sm mt-3">
          Olá, <strong>{dados.obra.cliente.nome}</strong>! {dados.modoComparativo
            ? 'Recebemos múltiplos orçamentos para você comparar e escolher o melhor.'
            : 'Você tem um orçamento para aprovação.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4">
        <p className="text-xs text-gray-400 uppercase font-semibold">Etapa</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">{dados.etapa.nome}</p>
        <p className="text-sm font-semibold text-gray-900 mt-1">{dados.descricao}</p>
        {dados.observacoes && <p className="text-xs text-gray-500 mt-1">{dados.observacoes}</p>}
      </div>

      {dados.modoComparativo && dados.orcamentos.length > 0 ? (
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Selecione o orçamento de sua preferência:</p>
          <div className="space-y-3">
            {dados.orcamentos.map((orc, i) => {
              const selecionado = orcamentoSelecionado === orc.id
              return (
                <button key={orc.id} type="button" onClick={() => setOrcamentoSelecionado(orc.id)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                    selecionado ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                        selecionado ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                      }`}>
                        {selecionado && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-400 uppercase">Opção {i + 1}</span>
                          {selecionado && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Selecionado</span>}
                        </div>
                        <p className="font-semibold text-gray-900">{orc.fornecedor}</p>
                        {orc.descricao && <p className="text-sm text-gray-500 mt-0.5">{orc.descricao}</p>}
                      </div>
                    </div>
                    <p className="text-xl font-bold text-gray-900 flex-shrink-0">{formatCurrency(orc.valor)}</p>
                  </div>
                  {orc.arquivoUrl && (
                    <InlineViewer url={orc.arquivoUrl} label={`Ver cotação — ${orc.fornecedor}`} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-5">
          <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Valor do orçamento</p>
            <p className="text-3xl font-bold text-indigo-900 mt-1">{formatCurrency(dados.valor)}</p>
            {dados.fornecedor && <p className="text-sm text-indigo-600 mt-1">Fornecedor: {dados.fornecedor}</p>}
          </div>
          {dados.comprovanteUrl && (
            <div className="px-5 py-4">
              <InlineViewer url={dados.comprovanteUrl} label="Ver cotação / Nota Fiscal" />
            </div>
          )}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>⚠ Atenção:</strong> Ao clicar em <strong>Aprovar</strong>, você confirma ciência e concordância. Esta ação fica registrada para respaldo contratual.
        </p>
      </div>

      {erroMsg && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700">{erroMsg}</div>}

      <div className="space-y-3">
        <button onClick={() => processar('APROVADO')} disabled={estado === 'processando' || (dados.modoComparativo && !orcamentoSelecionado)}
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {estado === 'processando' ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processando...</>)
            : dados.modoComparativo && !orcamentoSelecionado ? '← Selecione um orçamento'
            : '✓ Aprovar orçamento'}
        </button>
        <button onClick={() => processar('REPROVADO')} disabled={estado === 'processando'}
          className="w-full py-4 bg-white text-red-600 font-semibold rounded-2xl text-base border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-colors disabled:opacity-50">
          ✗ Reprovar
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">eBuild · Link válido por 72h · Uso único</p>
    </PageShell>
  )
}


function InlineViewer({ url, label }: { url: string; label: string }) {
  const [aberto, setAberto] = useState(false)
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url.split('?')[0])
  const isPdf = /\.pdf$/i.test(url.split('?')[0])

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 w-full flex items-center gap-2 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-100 transition-colors"
      >
        📄 {label}
      </button>

      {aberto && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setAberto(false)}
        >
          <div
            style={{
              backgroundColor: '#fff', borderRadius: '16px',
              width: '100%', maxWidth: '800px', maxHeight: '90vh',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{label}</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a href={url} download style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '8px', border: '1px solid #d1d5db', color: '#374151', textDecoration: 'none' }}>
                  ⬇ Baixar
                </a>
                <button onClick={() => setAberto(false)} style={{ width: '28px', height: '28px', borderRadius: '8px', border: 'none', background: '#f3f4f6', cursor: 'pointer', fontSize: '16px' }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {isPdf && (
                <iframe src={url} style={{ width: '100%', height: 'calc(90vh - 60px)', border: 'none', display: 'block' }} title={label} />
              )}
              {isImage && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: '#f9fafb', minHeight: '300px' }}>
                  <img src={url} alt={label} style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 100px)', objectFit: 'contain', borderRadius: '8px' }} />
                </div>
              )}
              {!isPdf && !isImage && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px', backgroundColor: '#f9fafb' }}>
                  <span style={{ fontSize: '48px', marginBottom: '16px' }}>📁</span>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>Este arquivo não pode ser visualizado aqui.</p>
                  <a href={url} download style={{ padding: '8px 20px', backgroundColor: '#4f46e5', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>⬇ Baixar</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-md mx-auto">{children}</div>
    </div>
  )
}

function ResultCard({ icon, title, message, color }: { icon: string; title: string; message: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 border-green-200 text-green-800', red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800', blue: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  const iconBg: Record<string, string> = { green: 'bg-green-100', red: 'bg-red-100', amber: 'bg-amber-100', blue: 'bg-blue-100' }
  return (
    <div className={`rounded-2xl border-2 p-8 text-center ${colors[color]}`}>
      <div className={`w-16 h-16 ${iconBg[color]} rounded-full flex items-center justify-center text-3xl mx-auto mb-4`}>{icon}</div>
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      <p className="text-sm leading-relaxed opacity-80">{message}</p>
    </div>
  )
}
