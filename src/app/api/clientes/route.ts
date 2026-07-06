// src/app/api/clientes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const clienteSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  whatsapp: z.string().min(10),
  cpfCnpj: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const clientes = await prisma.cliente.findMany({
    where: { ativo: true },
    include: { _count: { select: { obras: true } } },
    orderBy: { nome: 'asc' },
  })

  return NextResponse.json(clientes)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = clienteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const cliente = await prisma.cliente.create({ data: parsed.data })
  return NextResponse.json(cliente, { status: 201 })
}
