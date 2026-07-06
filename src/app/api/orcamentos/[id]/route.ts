// src/app/api/orcamentos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const orcamento = await prisma.orcamento.findUnique({ where: { id: params.id } })
  if (!orcamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  await prisma.orcamento.delete({ where: { id: params.id } })

  // Se não sobrou orçamento, desliga modo comparativo
  const restantes = await prisma.orcamento.count({ where: { lancamentoId: orcamento.lancamentoId } })
  if (restantes === 0) {
    await prisma.lancamento.update({
      where: { id: orcamento.lancamentoId },
      data: { modoComparativo: false },
    })
  }

  return NextResponse.json({ success: true })
}
