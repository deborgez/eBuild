// src/app/api/lancamentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recalcularTaxaEtapa, recalcularTaxaBenfeitorias } from '@/lib/financeiro'
import { z } from 'zod'

const lancamentoSchema = z.object({
  obraId: z.string().uuid(),
  etapaId: z.string().uuid().optional().nullable(),
  contratoGlobalId: z.string().uuid().optional().nullable(),
  descricao: z.string().min(2),
  tipo: z.enum(['MATERIAL', 'MAO_DE_OBRA']),
  valor: z.number().min(0),
  fornecedor: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  comprovanteUrl: z.string().url().optional().nullable(),
  isGlobal: z.boolean().default(false),
  isBenfeitoria: z.boolean().default(false),
  modoComparativo: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const obraId = searchParams.get('obraId')
  const etapaId = searchParams.get('etapaId')
  const status = searchParams.get('status')

  const lancamentos = await prisma.lancamento.findMany({
    where: {
      ...(obraId && { obraId }),
      ...(etapaId && { etapaId }),
      ...(status && { status: status as any }),
    },
    include: {
      etapa: { select: { id: true, nome: true, eDocumentacao: true } },
      obra: { select: { id: true, nome: true } },
      contratoGlobal: { select: { id: true, nome: true } },
      aprovacoes: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(lancamentos)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const parsed = lancamentoSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { contratoGlobalId, ...rest } = parsed.data

  if (rest.etapaId) {
    const etapa = await prisma.etapa.findUnique({ where: { id: rest.etapaId }, select: { status: true } })
    if (etapa?.status === 'CONCLUIDA') {
      return NextResponse.json({ error: 'Esta etapa já foi concluída e não aceita novos lançamentos.' }, { status: 400 })
    }
  }

  const lancamento = await prisma.lancamento.create({
    data: {
      ...rest,
      contratoGlobalId: contratoGlobalId ?? null,
      status: 'PENDENTE',
    },
    include: {
      etapa: true,
      obra: { include: { cliente: true } },
      contratoGlobal: true,
    },
  })

  // Após criar lançamento, recalcula taxa da etapa se aplicável
  // (o lançamento novo entra como PENDENTE, mas a taxa deve refletir o estado atual)
  if (lancamento.etapaId && !lancamento.descricao.startsWith('Taxa de Administração')) {
    if (lancamento.isBenfeitoria) {
      await recalcularTaxaBenfeitorias(lancamento.etapaId)
    } else {
      await recalcularTaxaEtapa(lancamento.etapaId)
    }
  }

  return NextResponse.json(lancamento, { status: 201 })
}
