// src/app/api/obras/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const obraSchema = z.object({
  clienteId: z.string().uuid(),
  nome: z.string().min(3),
  endereco: z.string().optional(),
  areaM2: z.number().positive(),
  prazoMeses: z.number().int().positive(),
  valorGlobalEstimado: z.number().positive(),
  custoBaseReferenciaM2: z.number().positive().default(2100),
  taxaAdministracaoPct: z.number().min(0).max(100).default(16),
  dataInicio: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const obras = await prisma.obra.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      cliente: { select: { id: true, nome: true, whatsapp: true } },
      etapas: { select: { id: true, percentualConclusao: true, eDocumentacao: true } },
      _count: { select: { lancamentos: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(obras)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = obraSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { dataInicio, ...rest } = parsed.data

  const obra = await prisma.obra.create({
    data: {
      ...rest,
      dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
      status: 'EM_ANDAMENTO',
    },
    include: { cliente: true },
  })

  return NextResponse.json(obra, { status: 201 })
}
