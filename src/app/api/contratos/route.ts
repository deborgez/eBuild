// src/app/api/contratos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validarArquivo } from '@/lib/upload-validation'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const obraId = searchParams.get('obraId')

  const contratos = await prisma.contratoGlobal.findMany({
    where: { ...(obraId && { obraId }) },
    include: {
      parcelas: {
        select: {
          id: true, valor: true, status: true,
          etapaId: true, etapa: { select: { nome: true } }, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const contratosComSaldo = contratos.map((c) => {
    const valorPagoReal = c.parcelas.filter((p) => p.status === 'PAGO').reduce((acc, p) => acc + p.valor, 0)
    const valorComprometido = c.parcelas.filter((p) => ['APROVADO', 'PAGO'].includes(p.status)).reduce((acc, p) => acc + p.valor, 0)
    return {
      ...c,
      valorPagoReal,
      valorComprometido,
      saldoRestante: c.valorTotal - valorComprometido,
      percentualPago: c.valorTotal > 0 ? (valorPagoReal / c.valorTotal) * 100 : 0,
    }
  })

  return NextResponse.json(contratosComSaldo)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  // Suporta multipart/form-data (com arquivo) ou application/json (sem arquivo)
  const contentType = req.headers.get('content-type') ?? ''

  let obraId: string, nome: string, fornecedor: string, tipo: string
  let valorTotal: number, observacoes: string | null = null, arquivoUrl: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    obraId = formData.get('obraId') as string
    nome = formData.get('nome') as string
    fornecedor = formData.get('fornecedor') as string
    tipo = formData.get('tipo') as string
    valorTotal = parseFloat(formData.get('valorTotal') as string)
    observacoes = formData.get('observacoes') as string || null

    const file = formData.get('arquivo') as File | null
    if (file && file.size > 0) {
      const erroValidacao = validarArquivo(file)
      if (erroValidacao) return NextResponse.json({ error: erroValidacao }, { status: 400 })

      const { supabaseAdmin } = await import('@/lib/supabase')
      const ext = file.name.split('.').pop()
      const path = `contratos/${obraId}/${Date.now()}.${ext}`
      const arrayBuffer = await file.arrayBuffer()
      await supabaseAdmin.storage.from('comprovantes').upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type, upsert: true,
      })
      const { data } = supabaseAdmin.storage.from('comprovantes').getPublicUrl(path)
      arquivoUrl = data.publicUrl
    }
  } else {
    const body = await req.json()
    obraId = body.obraId
    nome = body.nome
    fornecedor = body.fornecedor
    tipo = body.tipo
    valorTotal = body.valorTotal
    observacoes = body.observacoes ?? null
  }

  if (!obraId || !nome || !fornecedor || !tipo || !valorTotal) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const contrato = await prisma.contratoGlobal.create({
    data: { obraId, nome, fornecedor, tipo: tipo as any, valorTotal, observacoes, arquivoUrl } as any,
  })

  return NextResponse.json(contrato, { status: 201 })
}
