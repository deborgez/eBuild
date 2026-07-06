// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client para uso no browser (componentes client-side)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin para uso no servidor (upload de arquivos, etc.)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Faz upload de um arquivo para o bucket 'comprovantes' no Supabase Storage.
 * Retorna a URL pública do arquivo.
 */
export async function uploadComprovante(
  file: File,
  lancamentoId: string
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `lancamentos/${lancamentoId}/${Date.now()}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('comprovantes')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (error) throw new Error(`Erro ao fazer upload: ${error.message}`)

  const { data } = supabaseAdmin.storage.from('comprovantes').getPublicUrl(path)
  return data.publicUrl
}
