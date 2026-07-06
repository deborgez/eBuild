// src/app/api/obras/[id]/encerrar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcularEqualizacaoFinal } from '@/lib/financeiro'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const obra = await prisma.obra.findUnique({ where: { id: params.id } })
  if (!obra) return NextResponse.json({ error: 'Obra não encontrada' }, { status: 404 })
  if (obra.status === 'ENCERRADA') {
    return NextResponse.json({ error: 'Obra já encerrada' }, { status: 400 })
  }

  // Executa o motor de equalização
  const resultado = await calcularEqualizacaoFinal(params.id)

  // Atualiza status da obra
  await prisma.obra.update({
    where: { id: params.id },
    data: { status: 'ENCERRADA', dataEncerramento: new Date() },
  })

  return NextResponse.json({ success: true, equalizacao: resultado })
}
