// src/app/api/perfil/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { id: (session.user as any).id },
    select: { nome: true, email: true, telefone: true, empresa: true, cnpj: true, role: true },
  })

  return NextResponse.json(usuario)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { nome, email, telefone, empresa, cnpj } = body
  const isAdmin = (session.user as any).role === 'ADMIN'

  const usuario = await prisma.usuario.update({
    where: { id: (session.user as any).id },
    data: {
      nome, email, telefone,
      // Dados da empresa só podem ser alterados pelo administrador
      ...(isAdmin ? { empresa, cnpj } : {}),
    },
    select: { nome: true, email: true, telefone: true, empresa: true, cnpj: true, role: true },
  })

  return NextResponse.json(usuario)
}
