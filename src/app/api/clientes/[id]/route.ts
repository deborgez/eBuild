// src/app/api/clientes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const cliente = await prisma.cliente.findUnique({
    where: { id: params.id },
    include: {
      obras: {
        include: { _count: { select: { lancamentos: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  return NextResponse.json(cliente)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const cliente = await prisma.cliente.update({ where: { id: params.id }, data: body })

  return NextResponse.json(cliente)
}
