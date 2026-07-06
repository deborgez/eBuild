// src/lib/magic-link.ts
import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'

const SECRET = process.env.MAGIC_LINK_SECRET!
const EXPIRY_HOURS = 72

export interface MagicLinkPayload {
  sub: string   // lancamentoId
  jti: string   // UUID único — usado para invalidação one-time-use
  iat: number
  exp: number
}

export function gerarMagicToken(lancamentoId: string): {
  token: string
  jti: string
  expiracao: Date
} {
  const jti = randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + EXPIRY_HOURS * 3600

  const token = jwt.sign(
    { sub: lancamentoId, jti },
    SECRET,
    { algorithm: 'HS256', expiresIn: `${EXPIRY_HOURS}h` }
  )

  return { token, jti, expiracao: new Date(exp * 1000) }
}

export function validarMagicToken(token: string): MagicLinkPayload {
  return jwt.verify(token, SECRET) as MagicLinkPayload
}

/**
 * Monta a URL do link mágico. Recebe a base preferencialmente derivada da própria
 * requisição (host real) — NEXT_PUBLIC_BASE_URL é resolvida em tempo de build pelo
 * Next.js, então fica desatualizada se a variável mudar depois do deploy na Vercel.
 */
export function gerarUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  return `${base}/aprovacao/${token}`
}
