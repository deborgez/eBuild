// src/app/api/usuarios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const usuarioUpdateSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  telefone: z.string().optional().nullable(),
  role: z.enum(['ADMIN', 'CONSTRUTORA']),
  ativo: z.boolean(),
  senha: z.string().min(6).optional().or(z.literal('')),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem editar usuários.' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = usuarioUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const alvo = await prisma.usuario.findUnique({ where: { id: params.id } })
  if (!alvo) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const rebaixandoOuDesativandoASi = params.id === (session.user as any).id
    && (parsed.data.role !== 'ADMIN' || !parsed.data.ativo)
  if (rebaixandoOuDesativandoASi) {
    return NextResponse.json({ error: 'Você não pode remover seu próprio acesso de administrador.' }, { status: 400 })
  }

  if (alvo.role === 'ADMIN' && (parsed.data.role !== 'ADMIN' || !parsed.data.ativo)) {
    const outrosAdminsAtivos = await prisma.usuario.count({
      where: { role: 'ADMIN', ativo: true, id: { not: params.id } },
    })
    if (outrosAdminsAtivos === 0) {
      return NextResponse.json({ error: 'Não é possível remover o último administrador ativo do sistema.' }, { status: 400 })
    }
  }

  if (parsed.data.email !== alvo.email) {
    const emailEmUso = await prisma.usuario.findUnique({ where: { email: parsed.data.email } })
    if (emailEmUso) return NextResponse.json({ error: 'Já existe um usuário com este e-mail.' }, { status: 400 })
  }

  const usuario = await prisma.usuario.update({
    where: { id: params.id },
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email,
      telefone: parsed.data.telefone || null,
      role: parsed.data.role,
      ativo: parsed.data.ativo,
      ...(parsed.data.senha ? { senha: await bcrypt.hash(parsed.data.senha, 12) } : {}),
    },
    select: { id: true, nome: true, email: true, telefone: true, role: true, ativo: true, createdAt: true },
  })

  return NextResponse.json(usuario)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  if ((session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Apenas administradores podem excluir usuários.' }, { status: 403 })
  }

  if (params.id === (session.user as any).id) {
    return NextResponse.json({ error: 'Você não pode excluir a si mesmo.' }, { status: 400 })
  }

  const alvo = await prisma.usuario.findUnique({ where: { id: params.id } })
  if (!alvo) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  if (alvo.role === 'ADMIN') {
    const outrosAdmins = await prisma.usuario.count({ where: { role: 'ADMIN', id: { not: params.id } } })
    if (outrosAdmins === 0) {
      return NextResponse.json({ error: 'Não é possível excluir o último administrador do sistema.' }, { status: 400 })
    }
  }

  await prisma.usuario.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
