// src/app/api/lancamentos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularTaxaEtapa, recalcularTaxaBenfeitoria, sincronizarStatusFatura, recalcularProgressoEtapa } from '@/lib/financeiro'

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
    } else if (!isTaxa && body.status) {
      // Recalcula taxa (base ou de benfeitoria) e atualiza progresso
      if (lancamento.isBenfeitoria) {
        await recalcularTaxaBenfeitoria(lancamento.id)
      } else {
        await recalcularTaxaEtapa(lancamento.etapaId)
      }
      await recalcularProgressoEtapa(lancamento.etapaId)
    }
  }

  // Atualiza valorPago do contrato global se parcela foi paga
  if (body.status === 'PAGO' && lancamento.contratoGlobalId) {
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

  if (!['PENDENTE', 'REPROVADO'].includes(lancamento.status)) {
    return NextResponse.json({ error: 'Só é possível remover lançamentos pendentes ou reprovados.' }, { status: 400 })
  }

  await prisma.lancamento.delete({ where: { id: params.id } })

  if (lancamento.etapaId && !lancamento.descricao.startsWith('Taxa de Administração')) {
    if (lancamento.isBenfeitoria) {
      // A benfeitoria foi removida — remove também sua taxa dedicada, se ainda não paga
      const taxaVinculada = await prisma.lancamento.findFirst({
        where: { etapaId: lancamento.etapaId, descricao: { endsWith: `— Benfeitoria: ${lancamento.descricao}` } },
      })
      if (taxaVinculada && taxaVinculada.status !== 'PAGO') {
        await prisma.faturaAdmin.deleteMany({ where: { lancamentoId: taxaVinculada.id } })
        await prisma.lancamento.delete({ where: { id: taxaVinculada.id } })
      }
    } else {
      await recalcularTaxaEtapa(lancamento.etapaId)
    }
    await recalcularProgressoEtapa(lancamento.etapaId)
  }

  return NextResponse.json({ success: true })
}
