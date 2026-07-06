// src/app/api/lancamentos/[id]/notificar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { gerarMagicToken, gerarUrl } from '@/lib/magic-link'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const lancamento = await prisma.lancamento.findUnique({
    where: { id: params.id },
    include: { obra: { include: { cliente: true } } },
  })

  if (!lancamento) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })
  if (lancamento.status !== 'PENDENTE') {
    return NextResponse.json({ error: 'Lançamento já foi processado' }, { status: 400 })
  }

  // Gera o token
  const { token, jti, expiracao } = gerarMagicToken(params.id)

  // Persiste o jti no banco
  await prisma.lancamento.update({
    where: { id: params.id },
    data: { magicToken: jti, tokenExpiracao: expiracao },
  })

  // Deriva o domínio a partir da própria requisição (funciona em qualquer ambiente,
  // sem depender de uma variável de ambiente fixada em tempo de build).
  const host = req.headers.get('host')
  const protocolo = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')
  const baseUrl = host ? `${protocolo}://${host}` : undefined
  const url = gerarUrl(token, baseUrl)
  const cliente = lancamento.obra.cliente

  // Log da URL gerada (em produção, enviar via WhatsApp/e-mail)
  console.log(`📲 Link Mágico para ${cliente.nome}: ${url}`)

  // Aqui você integraria com Twilio/Z-API para WhatsApp e Resend para e-mail
  // Exemplo:
  // await enviarWhatsApp(cliente.whatsapp, `Olá ${cliente.nome}! Você tem um novo orçamento para aprovar: ${url}`)
  // await enviarEmail(cliente.email, 'Novo orçamento para aprovação', url)

  return NextResponse.json({
    success: true,
    url,
    expiracao,
    destinatario: {
      nome: cliente.nome,
      email: cliente.email,
      whatsapp: cliente.whatsapp,
    },
  })
}
