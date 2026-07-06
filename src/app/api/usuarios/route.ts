// src/app/api/usuarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const usuarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.enum(['ADMIN', 'CONSTRUTORA']),
  telefone: z.string().optional().nullable(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem ver os usuários.' }, { status: 403 })
  }

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nome: true, email: true, telefone: true, role: true, ativo: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(usuarios)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem adicionar usuários.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = usuarioSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const existente = await prisma.usuario.findUnique({ where: { email: parsed.data.email } })
  if (existente) {
    return NextResponse.json({ error: 'Já existe um usuário com este e-mail.' }, { status: 400 })
  }

  const senhaHash = await bcrypt.hash(parsed.data.senha, 12)
  const usuario = await prisma.usuario.create({
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email,
      senha: senhaHash,
      role: parsed.data.role,
      telefone: parsed.data.telefone || null,
    },
    select: { id: true, nome: true, email: true, telefone: true, role: true, ativo: true, createdAt: true },
  })

  return NextResponse.json(usuario, { status: 201 })
}
