'use client'
// src/components/dashboard/prazo-indicador.tsx
import { useEffect, useState } from 'react'

interface PrazoIndicadorProps {
  dataInicio: string | Date | null
  prazoMeses: number
  status: string
}

export function PrazoIndicador({ dataInicio, prazoMeses, status }: PrazoIndicadorProps) {
  const [agora, setAgora] = useState<Date | null>(null)

  useEffect(() => {
    // Usa hora local do dispositivo (suficiente para o caso de uso)
    setAgora(new Date())
  }, [])

  if (!dataInicio || !agora || status === 'ENCERRADA') return null

  const inicio = new Date(dataInicio)
  const fimPrevisto = new Date(inicio)
  fimPrevisto.setMonth(fimPrevisto.getMonth() + prazoMeses)

  const diasTotais = Math.round((fimPrevisto.getTime() - inicio.getTime()) / 86400000)
  const diasDecorridos = Math.round((agora.getTime() - inicio.getTime()) / 86400000)
  const diasRestantes = Math.round((fimPrevisto.getTime() - agora.getTime()) / 86400000)
  const percentualTempo = Math.min(Math.max((diasDecorridos / diasTotais) * 100, 0), 100)

  const dentroDoPrazo = diasRestantes >= 0
  const proximoVencimento = dentroDoPrazo && diasRestantes <= 30

  const cor = !dentroDoPrazo ? '#ef4444' : proximoVencimento ? '#f59e0b' : '#22c55e'
  const corBg = !dentroDoPrazo ? 'rgba(239,68,68,0.08)' : proximoVencimento ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)'

  return (
    <div className="rounded-xl p-4 border" style={{ backgroundColor: corBg, borderColor: cor + '40' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: cor }}>
          {!dentroDoPrazo ? '⚠ Fora do prazo' : proximoVencimento ? '⏰ Prazo se aproximando' : '✓ Dentro do prazo'}
        </p>
        <p className="text-xs font-medium" style={{ color: cor }}>
          {!dentroDoPrazo
            ? `${Math.abs(diasRestantes)} dias de atraso`
            : `${diasRestantes} dias restantes`}
        </p>
      </div>

      <div className="rounded-full h-2 mb-2" style={{ backgroundColor: 'var(--color-border)' }}>
        <div className="h-2 rounded-full transition-all"
          style={{ width: `${percentualTempo}%`, backgroundColor: cor }} />
      </div>

      <div className="flex justify-between text-xs" style={{ color: 'var(--color-text-muted)' }}>
        <span>Início: {inicio.toLocaleDateString('pt-BR')}</span>
        <span>Previsão: {fimPrevisto.toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  )
}
