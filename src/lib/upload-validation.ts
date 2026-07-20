// src/lib/upload-validation.ts
const TIPOS_PERMITIDOS = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

// Fotos de iPhone (HEIC/HEIF) são convertidas para JPEG no servidor antes de salvar —
// ver ehArquivoHeic()/converterHeicParaJpeg() em src/app/api/upload/route.ts. Alguns
// navegadores mandam o arquivo sem MIME type (application/octet-stream) ou vazio, então a
// extensão do nome do arquivo também é usada para detectar o formato.
const TIPOS_HEIC = ['image/heic', 'image/heif']

const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024 // 10MB

export function ehArquivoHeic(file: File): boolean {
  if (TIPOS_HEIC.includes(file.type)) return true
  return /\.(heic|heif)$/i.test(file.name)
}

export function validarArquivo(file: File): string | null {
  if (file.size > TAMANHO_MAXIMO_BYTES) {
    return 'Arquivo muito grande. Tamanho máximo permitido: 10MB.'
  }
  if (!TIPOS_PERMITIDOS.includes(file.type) && !ehArquivoHeic(file)) {
    return 'Tipo de arquivo não permitido. Envie PDF, imagem (JPG/PNG/WEBP/GIF/HEIC) ou documento Office.'
  }
  return null
}
