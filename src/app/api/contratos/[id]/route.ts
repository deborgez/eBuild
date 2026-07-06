// src/app/api/contratos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const contrato = await prisma.contratoGlobal.update({
    where: { id: params.id },
    data: body,
  })
  return NextResponse.json(contrato)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Verifica se há parcelas lançadas
  const parcelas = await prisma.lancamento.count({ where: { contratoGlobalId: params.id } })
  if (parcelas > 0) {
    return NextResponse.json({ error: 'Não é possível excluir um contrato com parcelas lançadas.' }, { status: 400 })
  }

  await prisma.contratoGlobal.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
