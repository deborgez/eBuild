// src/app/api/obras/[id]/relatorio/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getResumoFinanceiro } from '@/lib/financeiro'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const obra = await prisma.obra.findUnique({
    where: { id: params.id },
    include: {
      cliente: true,
      etapas: {
        orderBy: { ordem: 'asc' },
        include: {
          lancamentos: { orderBy: { createdAt: 'asc' } },
          fotos: { orderBy: { createdAt: 'asc' } },
        },
      },
      contratosGlobais: true,
    },
  })

  if (!obra) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  const financeiro = await getResumoFinanceiro(params.id)

  const etapasNormais = obra.etapas.filter((e) => !e.eDocumentacao)
  const etapaDoc = obra.etapas.find((e) => e.eDocumentacao)

  return NextResponse.json({
    obra: {
      nome: obra.nome, endereco: obra.endereco, areaM2: obra.areaM2,
      prazoMeses: obra.prazoMeses, dataInicio: obra.dataInicio, status: obra.status,
      cliente: { nome: obra.cliente.nome, email: obra.cliente.email, whatsapp: obra.cliente.whatsapp },
    },
    financeiro,
    etapas: etapasNormais.map((e) => ({
      nome: e.nome, descricao: e.descricao,
      percentualConclusao: e.percentualConclusao,
      percentualObra: (e as any).percentualObra ?? 0,
      lancamentos: e.lancamentos
        .filter((l) => !l.descricao.startsWith('Taxa de Administração') && !l.isBenfeitoria)
        .map((l) => ({ descricao: l.descricao, valor: l.valor, status: l.status, tipo: l.tipo, fornecedor: l.fornecedor })),
      fotos: e.fotos.map((f) => ({ url: f.url, descricao: f.descricao })),
    })),
    contratos: obra.contratosGlobais.map((c) => ({
      nome: c.nome, fornecedor: c.fornecedor, valorTotal: c.valorTotal, valorPagoReal: c.valorPago,
    })),
    documentacao: etapaDoc
      ? etapaDoc.lancamentos.map((l) => ({
          descricao: l.descricao, valor: l.valor, fornecedor: l.fornecedor, comprovanteUrl: l.comprovanteUrl,
        }))
      : [],
    benfeitorias: etapasNormais.flatMap((e) =>
      e.lancamentos
        .filter((l) => l.isBenfeitoria)
        .map((l) => ({
          descricao: l.descricao, valor: l.valor, fornecedor: l.fornecedor,
          status: l.status, comprovanteUrl: l.comprovanteUrl, etapaNome: e.nome,
        }))
    ),
  })
}
