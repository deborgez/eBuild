// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { validarArquivo, ehArquivoHeic } from '@/lib/upload-validation'
import convertHeic from 'heic-convert'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const lancamentoId = formData.get('lancamentoId') as string | null
    const etapaId = formData.get('etapaId') as string | null

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const erroValidacao = validarArquivo(file)
    if (erroValidacao) return NextResponse.json({ error: erroValidacao }, { status: 400 })

    const pasta = lancamentoId ? `lancamentos/${lancamentoId}` : etapaId ? `etapas/${etapaId}` : 'temp'

    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    let ext = file.name.split('.').pop()
    let contentType = file.type

    // Fotos de iPhone vêm em HEIC por padrão — a maioria dos navegadores não consegue
    // exibir esse formato, então convertemos para JPEG antes de salvar.
    if (ehArquivoHeic(file)) {
      try {
        buffer = Buffer.from(await convertHeic({ buffer, format: 'JPEG', quality: 0.85 }))
        ext = 'jpg'
        contentType = 'image/jpeg'
      } catch (err) {
        console.error('Erro ao converter HEIC:', err)
        return NextResponse.json({ error: 'Não foi possível converter a imagem HEIC. Tente exportar como JPG antes de enviar.' }, { status: 400 })
      }
    }

    const path = `${pasta}/${Date.now()}.${ext}`

    const { error } = await supabaseAdmin.storage
      .from('comprovantes')
      .upload(path, buffer, {
        contentType,
        upsert: true,
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return NextResponse.json({ error: `Erro ao fazer upload: ${error.message}` }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from('comprovantes').getPublicUrl(path)

    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error('Erro inesperado no upload:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro inesperado no upload' }, { status: 500 })
  }
}
