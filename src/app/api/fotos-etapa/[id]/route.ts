// src/app/api/fotos-etapa/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const foto = await prisma.fotoEtapa.findUnique({ where: { id: params.id } })
  if (!foto) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  await prisma.fotoEtapa.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
