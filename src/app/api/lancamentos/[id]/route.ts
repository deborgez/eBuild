// src/app/api/lancamentos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularTaxaEtapa, recalcularTaxaBenfeitorias, sincronizarStatusFatura, recalcularProgressoEtapa } from '@/lib/financeiro'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const lancamento = await prisma.lancamento.findUnique({
    where: { id: params.id },
    include: {
      etapa: true,
      obra: { include: { cliente: true } },
      contratoGlobal: true,
      aprovacoes: { orderBy: { createdAt: 'desc' } },
      orcamentos: { orderBy: { ordem: 'asc' } },
    },
  })

  if (!lancamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(lancamento)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()

  const lancamento = await prisma.lancamento.update({
    where: { id: params.id },
    data: body,
  })

  if (lancamento.etapaId) {
    const isTaxa = lancamento.descricao.startsWith('Taxa de Administração')

    if (isTaxa && body.status === 'PAGO') {
      // Sincroniza FaturaAdmin e atualiza progresso
      await sincronizarStatusFatura(lancamento.id)
      await recalcularProgressoEtapa(lancamento.etapaId)
    } else if (!isTaxa) {
      // Qualquer edição de um lançamento normal (status, valor, tipo, benfeitoria...) pode
      // afetar a taxa e o progresso da etapa — recalcula sempre, não só na troca de status.
      if (lancamento.isBenfeitoria) {
        await recalcularTaxaBenfeitorias(lancamento.etapaId)
      } else {
        await recalcularTaxaEtapa(lancamento.etapaId)
      }
      await recalcularProgressoEtapa(lancamento.etapaId)
    }
  }

  // Atualiza valorPago do contrato global se a parcela mudou (pago ou valor editado)
  if (lancamento.contratoGlobalId) {
    const parcelas = await prisma.lancamento.findMany({
      where: { contratoGlobalId: lancamento.contratoGlobalId, status: 'PAGO' },
      select: { valor: true },
    })
    const totalPago = parcelas.reduce((acc, p) => acc + p.valor, 0)
    await prisma.contratoGlobal.update({
      where: { id: lancamento.contratoGlobalId },
      data: { valorPago: totalPago },
    })
  }

  return NextResponse.json(lancamento)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const lancamento = await prisma.lancamento.findUnique({ where: { id: params.id } })
  if (!lancamento) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  try {
    await prisma.lancamento.delete({ where: { id: params.id } })
  } catch (error) {
    console.error('Erro ao remover lançamento:', error)
    return NextResponse.json({ error: 'Erro ao remover lançamento' }, { status: 500 })
  }

  if (lancamento.etapaId && !lancamento.descricao.startsWith('Taxa de Administração')) {
    if (lancamento.isBenfeitoria) {
      await recalcularTaxaBenfeitorias(lancamento.etapaId)
    } else {
      await recalcularTaxaEtapa(lancamento.etapaId)
    }
    await recalcularProgressoEtapa(lancamento.etapaId)
  }

  // Atualiza valorPago do contrato global caso a parcela removida estivesse paga
  if (lancamento.contratoGlobalId) {
    const parcelas = await prisma.lancamento.findMany({
      where: { contratoGlobalId: lancamento.contratoGlobalId, status: 'PAGO' },
      select: { valor: true },
    })
    const totalPago = parcelas.reduce((acc, p) => acc + p.valor, 0)
    await prisma.contratoGlobal.update({
      where: { id: lancamento.contratoGlobalId },
      data: { valorPago: totalPago },
    })
  }

  return NextResponse.json({ success: true })
}
