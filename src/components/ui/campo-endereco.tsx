'use client'
// src/components/ui/campo-endereco.tsx
// Campo de CEP com busca automática de endereço (ViaCEP) + campo de endereço editável
import { useState } from 'react'
import { maskCep, buscarEnderecoPorCep } from '@/lib/utils'

export function CampoEndereco({ endereco, onChangeEndereco }: {
  endereco: string
  onChangeEndereco: (endereco: string) => void
}) {
  const [cep, setCep] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [erroCep, setErroCep] = useState('')

  async function handleCepChange(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = maskCep(e.target.value)
    setCep(valor)
    setErroCep('')

    const digitos = valor.replace(/\D/g, '')
    if (digitos.length !== 8) return

    setBuscando(true)
    const resultado = await buscarEnderecoPorCep(valor)
    setBuscando(false)

    if (!resultado) {
      setErroCep('CEP não encontrado.')
      return
    }

    const partes = [resultado.logradouro, resultado.bairro].filter(Boolean).join(', ')
    const cidade = [resultado.localidade, resultado.uf].filter(Boolean).join('/')
    onChangeEndereco([partes, cidade].filter(Boolean).join(' — '))
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">CEP</label>
        <div className="relative max-w-[180px]">
          <input type="text" inputMode="numeric" value={cep} onChange={handleCepChange}
            placeholder="00000-000" className="input" maxLength={9} />
          {buscando && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              ...
            </span>
          )}
        </div>
        {erroCep && <p className="text-xs mt-1 text-red-500">{erroCep}</p>}
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Preenche o endereço automaticamente — complete com o número
        </p>
      </div>

      <div>
        <label className="label">Endereço</label>
        <input type="text" value={endereco} onChange={(e) => onChangeEndereco(e.target.value)}
          placeholder="Rua, número, bairro — cidade, UF" className="input" />
      </div>
    </div>
  )
}
