// src/app/api/etapas/[id]/documentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const documentoSchema = z.object({
  nome: z.string().min(1),
  url: z.string().url(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = documentoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const etapa = await prisma.etapa.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!etapa) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 })

  const documento = await prisma.documentoEtapa.create({
    data: { etapaId: params.id, nome: parsed.data.nome, url: parsed.data.url },
  })

  return NextResponse.json(documento, { status: 201 })
}
