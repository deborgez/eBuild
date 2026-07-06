// src/lib/upload-validation.ts
const TIPOS_PERMITIDOS = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024 // 10MB

export function validarArquivo(file: File): string | null {
  if (file.size > TAMANHO_MAXIMO_BYTES) {
    return 'Arquivo muito grande. Tamanho máximo permitido: 10MB.'
  }
  if (!TIPOS_PERMITIDOS.includes(file.type)) {
    return 'Tipo de arquivo não permitido. Envie PDF, imagem (JPG/PNG/WEBP/GIF) ou documento Office.'
  }
  return null
}
