// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Formata um CPF (11 dígitos) ou CNPJ (14 dígitos) a partir de uma string só com números (ou já formatada). */
export function formatCpfCnpj(valor: string): string {
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (digitos.length === 14) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return valor
}

/** Máscara de CPF/CNPJ para uso em onChange — formata progressivamente enquanto o usuário digita. */
export function maskCpfCnpj(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  if (digitos.length <= 11) {
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digitos
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Máscara de CNPJ (sempre 14 dígitos) — para campos que nunca aceitam CPF, como dados de empresa. */
export function maskCnpj(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

/** Máscara de telefone fixo (10 dígitos) ou celular (11 dígitos), sem código do país. */
export function maskTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 10) {
    return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digitos.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

/** Máscara de WhatsApp com código do país (ex: 55 11 999990000 → +55 (11) 99999-0000). */
export function maskWhatsapp(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 13)
  if (digitos.length <= 2) return digitos
  const pais = digitos.slice(0, 2)
  const resto = maskTelefone(digitos.slice(2))
  return `+${pais}${resto ? ' ' + resto : ''}`
}

/** Máscara de CEP (00000-000). */
export function maskCep(valor: string): string {
  return valor.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')
}

/** Busca endereço a partir de um CEP usando a API pública ViaCEP. Retorna null se inválido/não encontrado. */
export async function buscarEnderecoPorCep(cep: string): Promise<{
  logradouro: string; bairro: string; localidade: string; uf: string
} | null> {
  const digitos = cep.replace(/\D/g, '')
  if (digitos.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.erro) return null
    return { logradouro: data.logradouro, bairro: data.bairro, localidade: data.localidade, uf: data.uf }
  } catch {
    return null
  }
}

const UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
const DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']
const ESCALAS_SINGULAR = ['', 'mil', 'milhão', 'bilhão']
const ESCALAS_PLURAL = ['', 'mil', 'milhões', 'bilhões']

function trioPorExtenso(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const centena = Math.floor(n / 100)
  const resto = n % 100
  const partes: string[] = []
  if (centena > 0) partes.push(CENTENAS[centena])
  if (resto > 0) {
    if (resto < 10) partes.push(UNIDADES[resto])
    else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10])
    else {
      const dezena = Math.floor(resto / 10)
      const unidade = resto % 10
      partes.push(unidade === 0 ? DEZENAS[dezena] : `${DEZENAS[dezena]} e ${UNIDADES[unidade]}`)
    }
  }
  return partes.join(' e ')
}

function numeroPorExtenso(n: number): { texto: string; precisaDe: boolean } {
  if (n === 0) return { texto: 'zero', precisaDe: false }
  const grupos: number[] = []
  let restante = n
  while (restante > 0) { grupos.unshift(restante % 1000); restante = Math.floor(restante / 1000) }

  const partes: string[] = []
  let gruposNaoZero = 0
  let ultimaEscala = 0
  grupos.forEach((grupo, i) => {
    if (grupo === 0) return
    gruposNaoZero++
    const escala = grupos.length - 1 - i
    ultimaEscala = escala
    let texto = trioPorExtenso(grupo)
    if (escala === 1) texto = grupo === 1 ? 'mil' : `${texto} mil`
    else if (escala >= 2) texto = `${texto} ${grupo === 1 ? ESCALAS_SINGULAR[escala] : ESCALAS_PLURAL[escala]}`
    partes.push(texto)
  })

  // "de" só é usado quando o número é um valor "puro" de milhão(ões)/bilhão(ões) (ex: "um milhão de reais")
  const precisaDe = gruposNaoZero === 1 && ultimaEscala >= 2

  if (partes.length <= 1) return { texto: partes.join(''), precisaDe }
  const ultimoGrupo = grupos[grupos.length - 1]
  const juntaComE = ultimoGrupo > 0 && ultimoGrupo < 100
  const texto = partes.length === 2
    ? `${partes[0]}${juntaComE ? ' e ' : ' '}${partes[1]}`
    : `${partes.slice(0, -1).join(', ')}${juntaComE ? ' e ' : ' '}${partes[partes.length - 1]}`
  return { texto, precisaDe }
}

/** Escreve um valor monetário por extenso em português (ex: "mil e duzentos reais e cinquenta centavos"). */
export function valorPorExtenso(valor: number): string {
  const reais = Math.floor(Math.abs(valor))
  const centavos = Math.round((Math.abs(valor) - reais) * 100)

  const { texto: reaisTexto, precisaDe } = numeroPorExtenso(reais)
  let resultado = `${reaisTexto}${precisaDe ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}`
  if (centavos > 0) {
    const { texto: centavosTexto } = numeroPorExtenso(centavos)
    resultado += ` e ${centavosTexto} ${centavos === 1 ? 'centavo' : 'centavos'}`
  }
  return resultado
}

export const STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  PAGO: 'Pago',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  ENCERRADA: 'Encerrada',
  PAUSADA: 'Pausada',
  MATERIAL: 'Material',
  MAO_DE_OBRA: 'Mão de obra',
}

export const STATUS_COLORS: Record<string, string> = {
  PENDENTE: 'bg-amber-100 text-amber-800',
  APROVADO: 'bg-blue-100 text-blue-800',
  REPROVADO: 'bg-red-100 text-red-800',
  PAGO: 'bg-green-100 text-green-800',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  CONCLUIDA: 'bg-green-100 text-green-800',
  ENCERRADA: 'bg-concrete-100 text-concrete-800',
  PAUSADA: 'bg-amber-100 text-amber-800',
}
