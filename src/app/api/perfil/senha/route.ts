// src/app/api/perfil/senha/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { senhaAtual, novaSenha } = await req.json()

  const usuario = await prisma.usuario.findUnique({ where: { id: (session.user as any).id } })
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha)
  if (!senhaValida) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 })

  const novaSenhaHash = await bcrypt.hash(novaSenha, 12)
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senha: novaSenhaHash },
  })

  return NextResponse.json({ success: true })
}
