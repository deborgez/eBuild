// src/app/api/etapas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularTaxaEtapa } from '@/lib/financeiro'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const percentual = body.percentualConclusao !== undefined ? Number(body.percentualConclusao) : undefined

  const novoStatus =
    percentual === 100 ? 'CONCLUIDA'
    : percentual !== undefined && percentual > 0 ? 'EM_ANDAMENTO'
    : percentual === 0 ? 'PENDENTE'
    : undefined

  const etapa = await prisma.etapa.update({
    where: { id: params.id },
    data: {
      ...body,
      ...(percentual !== undefined && { percentualConclusao: percentual }),
      ...(novoStatus && { status: novoStatus }),
    },
  })

  // Gatilho: se chegou a 100%, calcular taxa de administração
  if (percentual === 100 && !etapa.eDocumentacao) {
    await recalcularTaxaEtapa(params.id)
  }

  return NextResponse.json(etapa)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.etapa.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
