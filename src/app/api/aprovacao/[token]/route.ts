// src/app/api/aprovacao/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validarMagicToken } from '@/lib/magic-link'
import { recalcularTaxaEtapa, recalcularTaxaBenfeitoria } from '@/lib/financeiro'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  let payload: any
  try { payload = validarMagicToken(params.token) }
  catch { return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 401 }) }

  const lancamento = await prisma.lancamento.findUnique({
    where: { id: payload.sub },
    include: {
      etapa: { select: { nome: true, eDocumentacao: true } },
      obra: { select: { nome: true, endereco: true, cliente: { select: { nome: true } } } },
      orcamentos: { orderBy: { ordem: 'asc' } },
    },
  })

  if (!lancamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (!lancamento.magicToken || lancamento.magicToken !== payload.jti) {
    return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 410 })
  }
  if (lancamento.status !== 'PENDENTE') {
    return NextResponse.json({ error: 'Este lançamento já foi processado' }, { status: 410 })
  }

  return NextResponse.json({
    id: lancamento.id,
    descricao: lancamento.descricao,
    tipo: lancamento.tipo,
    valor: lancamento.valor,
    fornecedor: lancamento.fornecedor,
    comprovanteUrl: lancamento.comprovanteUrl,
    observacoes: lancamento.observacoes,
    modoComparativo: lancamento.modoComparativo,
    orcamentos: lancamento.orcamentos,
    etapa: lancamento.etapa,
    obra: lancamento.obra,
  })
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'desconhecido'
  const userAgent = req.headers.get('user-agent') ?? ''

  let payload: any
  try { payload = validarMagicToken(params.token) }
  catch { return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 401 }) }

  const body = await req.json()
  const acao = body.acao as 'APROVADO' | 'REPROVADO'
  const orcamentoId = body.orcamentoId as string | undefined // ID do orçamento escolhido

  if (!['APROVADO', 'REPROVADO'].includes(acao)) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const lancamento = await prisma.lancamento.findUnique({
    where: { id: payload.sub },
    include: { orcamentos: true, etapa: true },
  })

  if (!lancamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (!lancamento.magicToken || lancamento.magicToken !== payload.jti) {
    return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 410 })
  }
  if (lancamento.status !== 'PENDENTE') {
    return NextResponse.json({ error: 'Este lançamento já foi processado' }, { status: 410 })
  }

  // Se modo comparativo, valida que o cliente escolheu um orçamento
  if (acao === 'APROVADO' && lancamento.modoComparativo && !orcamentoId) {
    return NextResponse.json({ error: 'Selecione um orçamento antes de aprovar' }, { status: 400 })
  }

  // Encontra o orçamento escolhido para pegar o valor
  const orcamentoEscolhido = orcamentoId
    ? lancamento.orcamentos.find((o) => o.id === orcamentoId)
    : null

  // Valor final: do orçamento escolhido ou do lançamento direto
  const valorFinal = orcamentoEscolhido ? orcamentoEscolhido.valor : lancamento.valor

  await prisma.$transaction(async (tx) => {
    // Atualiza lançamento
    await tx.lancamento.update({
      where: { id: payload.sub },
      data: {
        status: acao,
        valor: valorFinal, // Atualiza com valor do orçamento escolhido
        fornecedor: orcamentoEscolhido ? orcamentoEscolhido.fornecedor : lancamento.fornecedor,
        magicToken: null,
        tokenExpiracao: null,
      },
    })

    // Marca orçamento escolhido
    if (orcamentoId && acao === 'APROVADO') {
      await tx.orcamento.update({
        where: { id: orcamentoId },
        data: { escolhido: true },
      })
    }

    // Log de aprovação
    await tx.aprovacao.create({
      data: {
        lancamentoId: payload.sub,
        orcamentoId: orcamentoId ?? null,
        acao,
        ipCliente: ip,
        userAgent,
      },
    })
  })

  // Recalcula a taxa: benfeitorias são cobradas por lançamento; demais lançamentos ativam/
  // atualizam a taxa "base" proporcional ao percentual da etapa.
  if (acao === 'APROVADO' && lancamento.etapaId) {
    if (lancamento.isBenfeitoria) {
      await recalcularTaxaBenfeitoria(lancamento.id)
    } else {
      await recalcularTaxaEtapa(lancamento.etapaId)
    }
  }

  return NextResponse.json({
    success: true,
    acao,
    orcamentoEscolhido: orcamentoEscolhido ? {
      fornecedor: orcamentoEscolhido.fornecedor,
      valor: orcamentoEscolhido.valor,
    } : null,
  })
}
