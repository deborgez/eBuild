// src/app/api/etapas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const etapaSchema = z.object({
  obraId: z.string().uuid(),
  nome: z.string().min(2),
  descricao: z.string().optional(),
  ordem: z.number().int().min(0),
  eDocumentacao: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = etapaSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const etapa = await prisma.etapa.create({
    data: { ...parsed.data, status: 'PENDENTE', percentualConclusao: 0 },
  })

  return NextResponse.json(etapa, { status: 201 })
}
