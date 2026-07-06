// src/app/api/orcamentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: adicionar orçamento a um lançamento
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { lancamentoId, fornecedor, valor, descricao, arquivoUrl, ordem } = body

  if (!lancamentoId || !fornecedor || !valor) {
    return NextResponse.json({ error: 'Campos obrigatórios: lancamentoId, fornecedor, valor' }, { status: 400 })
  }

  const orcamento = await prisma.orcamento.create({
    data: { lancamentoId, fornecedor, valor, descricao, arquivoUrl, ordem: ordem ?? 0 },
  })

  // Marca lançamento como modo comparativo
  await prisma.lancamento.update({
    where: { id: lancamentoId },
    data: { modoComparativo: true },
  })

  return NextResponse.json(orcamento, { status: 201 })
}
