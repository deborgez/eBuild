// src/app/api/faturas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sincronizarStatusFatura } from '@/lib/financeiro'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let fatura = await prisma.faturaAdmin.findUnique({
    where: { id: params.id },
    include: {
      etapa: { select: { nome: true } },
      obra: { select: { nome: true, endereco: true, cliente: { select: { nome: true, cpfCnpj: true } } } },
    },
  })

  if (!fatura) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  // Garante que o status reflita o pagamento real do lançamento de taxa antes de exibir/imprimir
  if (fatura.etapaId && fatura.tipoEqualizacao === null) {
    await sincronizarStatusFatura(fatura.etapaId)
    fatura = await prisma.faturaAdmin.findUnique({
      where: { id: params.id },
      include: {
        etapa: { select: { nome: true } },
        obra: { select: { nome: true, endereco: true, cliente: { select: { nome: true, cpfCnpj: true } } } },
      },
    })
  }

  // Dados da administradora (construtora) para o texto de declaração do recibo
  const administradora = await prisma.usuario.findUnique({
    where: { id: (session.user as any).id },
    select: { empresa: true, cnpj: true },
  })

  return NextResponse.json({ ...fatura, administradora })
}
