// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { validarArquivo } from '@/lib/upload-validation'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const lancamentoId = formData.get('lancamentoId') as string | null
  const etapaId = formData.get('etapaId') as string | null

  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const erroValidacao = validarArquivo(file)
  if (erroValidacao) return NextResponse.json({ error: erroValidacao }, { status: 400 })

  const ext = file.name.split('.').pop()
  const pasta = lancamentoId ? `lancamentos/${lancamentoId}` : etapaId ? `etapas/${etapaId}` : 'temp'
  const path = `${pasta}/${Date.now()}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await supabaseAdmin.storage
    .from('comprovantes')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) {
    console.error('Supabase upload error:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from('comprovantes').getPublicUrl(path)

  return NextResponse.json({ url: data.publicUrl })
}
