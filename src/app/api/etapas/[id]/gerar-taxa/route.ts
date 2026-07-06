// src/app/api/etapas/[id]/gerar-taxa/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recalcularTaxaEtapa } from '@/lib/financeiro'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await recalcularTaxaEtapa(params.id)

  return NextResponse.json({ success: true })
}
