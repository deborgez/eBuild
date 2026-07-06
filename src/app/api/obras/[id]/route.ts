// src/app/api/obras/[id]/route.ts
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
          lancamentos: {
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { lancamentos: true } },
        },
      },
      faturasAdmin: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 })

  const financeiro = await getResumoFinanceiro(params.id)

  return NextResponse.json({ ...obra, financeiro })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const obra = await prisma.obra.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json(obra)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.obra.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
