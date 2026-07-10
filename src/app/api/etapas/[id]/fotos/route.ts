// src/app/api/etapas/[id]/fotos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const fotoSchema = z.object({
  url: z.string().url(),
  descricao: z.string().optional().nullable(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = fotoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const etapa = await prisma.etapa.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!etapa) return NextResponse.json({ error: 'Etapa não encontrada' }, { status: 404 })

  const foto = await prisma.fotoEtapa.create({
    data: { etapaId: params.id, url: parsed.data.url, descricao: parsed.data.descricao ?? null },
  })

  return NextResponse.json(foto, { status: 201 })
}
