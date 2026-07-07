// src/lib/financeiro.ts
import { prisma } from './prisma'

/**
 * Recalcula e persiste percentualConclusao/status da etapa a partir do status
 * real dos lançamentos. Deve ser chamada sempre que um lançamento da etapa
 * mudar de status, e também de forma defensiva na leitura (ex: página da obra),
 * pois o valor persistido pode ficar desatualizado se algum gatilho falhar.
 */
// Marca o lançamento de taxa gerado para uma benfeitoria específica (cobrança por
// lançamento, já que é um valor não previsto no percentual da etapa).
const MARCADOR_TAXA_BENFEITORIA = '— Benfeitoria:'

function ehTaxaBase(descricao: string): boolean {
  return descricao.startsWith('Taxa de Administração') && !descricao.includes(MARCADOR_TAXA_BENFEITORIA)
}

export async function recalcularProgressoEtapa(etapaId: string): Promise<void> {
  const lancamentos = await prisma.lancamento.findMany({
    where: { etapaId },
    select: { valor: true, status: true, descricao: true, isBenfeitoria: true },
  })

  // Benfeitorias são valores à parte (como a documentação) — não contam no progresso da etapa
  const lancObra = lancamentos.filter((l) => !l.descricao.startsWith('Taxa de Administração') && !l.isBenfeitoria)
  // Só a taxa "base" (proporcional ao percentual da etapa) bloqueia a conclusão da etapa —
  // a taxa de benfeitoria é à parte e pode ficar pendente sem impedir a conclusão.
  const lancTaxa = lancamentos.filter((l) => ehTaxaBase(l.descricao))

  const totalValorObra = lancObra.reduce((acc, l) => acc + l.valor, 0)
  const totalPagoObra = lancObra.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
  const taxaGerada = lancTaxa.length > 0
  const taxaPaga = taxaGerada && lancTaxa.every((l) => l.status === 'PAGO')

  const progressoObra = totalValorObra > 0 ? (totalPagoObra / totalValorObra) * 100 : 0
  const todosObraPagos = totalValorObra > 0 && totalPagoObra >= totalValorObra
  const etapaConcluida = todosObraPagos && taxaGerada && taxaPaga

  const percentualConclusao = etapaConcluida ? 100 : Math.min(progressoObra, 99)
  const status = etapaConcluida ? 'CONCLUIDA' : progressoObra > 0 ? 'EM_ANDAMENTO' : 'PENDENTE'

  const etapaAtual = await prisma.etapa.findUnique({ where: { id: etapaId }, select: { percentualConclusao: true, status: true } })
  if (etapaAtual && etapaAtual.percentualConclusao === percentualConclusao && etapaAtual.status === status) return

  await prisma.etapa.update({
    where: { id: etapaId },
    data: { percentualConclusao, status },
  })
}

/**
 * Taxa de administração "base" da etapa: proporcional ao peso da etapa no valor
 * global da obra, e não à soma dos lançamentos reais. Ex.: etapa = 10% da obra,
 * taxa = 16% → cobrança = 16% × (10% × valorGlobalEstimado), independente de quanto
 * foi de fato gasto na etapa. A existência de ao menos um lançamento normal (não
 * benfeitoria) aprovado/pago serve apenas de sinal de que a etapa está em andamento
 * e a cobrança deve ser ativada.
 */
export async function recalcularTaxaEtapa(etapaId: string): Promise<void> {
  const etapa = await prisma.etapa.findUnique({
    where: { id: etapaId },
    include: { obra: true },
  })
  if (!etapa || etapa.eDocumentacao) return

  const taxaPct = etapa.obra.taxaAdministracaoPct
  const percentualObra = etapa.percentualObra

  const temAtividade = await prisma.lancamento.count({
    where: {
      etapaId,
      status: { in: ['APROVADO', 'PAGO'] },
      isBenfeitoria: false,
      descricao: { not: { startsWith: 'Taxa de Administração' } },
    },
  }) > 0

  // O filtro que exclui a marca de benfeitoria precisa estar no WHERE (não checado depois
  // em JS): sem isso, com múltiplas linhas de taxa na etapa, o findFirst pode retornar uma
  // linha de benfeitoria primeiro (ordem não garantida), fazendo o código achar que a taxa
  // base não existe e criar uma duplicata a cada novo lançamento aprovado.
  const taxaBaseExistente = await prisma.lancamento.findFirst({
    where: {
      etapaId,
      descricao: { startsWith: 'Taxa de Administração' },
      NOT: { descricao: { contains: MARCADOR_TAXA_BENFEITORIA } },
    },
  })

  if (!temAtividade || percentualObra <= 0) {
    if (taxaBaseExistente && taxaBaseExistente.status !== 'PAGO') {
      await prisma.faturaAdmin.deleteMany({ where: { lancamentoId: taxaBaseExistente.id } })
      await prisma.lancamento.delete({ where: { id: taxaBaseExistente.id } })
    }
    return
  }

  const baseCalculo = parseFloat((etapa.obra.valorGlobalEstimado * (percentualObra / 100)).toFixed(2))
  const valorTaxa = parseFloat((baseCalculo * (taxaPct / 100)).toFixed(2))
  const obs = `${percentualObra}% da obra (R$ ${baseCalculo.toFixed(2)}) × ${taxaPct}% = R$ ${valorTaxa.toFixed(2)}`

  if (taxaBaseExistente) {
    if (taxaBaseExistente.status !== 'PAGO') {
      await prisma.lancamento.update({
        where: { id: taxaBaseExistente.id },
        data: { valor: valorTaxa, observacoes: obs },
      })
      await prisma.faturaAdmin.updateMany({
        where: { lancamentoId: taxaBaseExistente.id },
        data: { baseCalculo, valorTaxa, taxaPct },
      })
    }
  } else {
    const novaTaxa = await prisma.lancamento.create({
      data: {
        obraId: etapa.obraId, etapaId,
        descricao: `Taxa de Administração (${taxaPct}%) — ${etapa.nome}`,
        tipo: 'MAO_DE_OBRA', valor: valorTaxa, fornecedor: 'Construtora',
        status: 'APROVADO', observacoes: obs, isGlobal: false,
      },
    })
    await prisma.faturaAdmin.create({
      data: { obraId: etapa.obraId, etapaId, lancamentoId: novaTaxa.id, baseCalculo, taxaPct, valorTaxa, equalizacaoValor: 0, status: 'PENDENTE' },
    })
  }
}

/**
 * Taxa de administração sobre as benfeitorias da etapa: cobrada sobre a soma dos valores
 * de benfeitoria aprovados/pagos (não sobre o percentual da etapa, já que são valores não
 * previstos no planejamento inicial). Aglutinada em UM único lançamento por etapa — cada
 * nova benfeitoria aprovada apenas atualiza esse valor, em vez de gerar uma cobrança nova.
 */
export async function recalcularTaxaBenfeitorias(etapaId: string): Promise<void> {
  const etapa = await prisma.etapa.findUnique({
    where: { id: etapaId },
    include: { obra: true },
  })
  if (!etapa || etapa.eDocumentacao) return

  const taxaPct = etapa.obra.taxaAdministracaoPct

  const benfeitorias = await prisma.lancamento.findMany({
    where: { etapaId, isBenfeitoria: true, status: { in: ['APROVADO', 'PAGO'] } },
    select: { valor: true },
  })
  const baseCalculo = parseFloat(benfeitorias.reduce((acc, l) => acc + l.valor, 0).toFixed(2))
  const valorTaxa = parseFloat((baseCalculo * (taxaPct / 100)).toFixed(2))

  const taxaExistente = await prisma.lancamento.findFirst({
    where: { etapaId, descricao: { contains: MARCADOR_TAXA_BENFEITORIA } },
  })

  if (baseCalculo === 0) {
    if (taxaExistente && taxaExistente.status !== 'PAGO') {
      await prisma.faturaAdmin.deleteMany({ where: { lancamentoId: taxaExistente.id } })
      await prisma.lancamento.delete({ where: { id: taxaExistente.id } })
    }
    return
  }

  const obs = `Benfeitorias: R$ ${baseCalculo.toFixed(2)} × ${taxaPct}% = R$ ${valorTaxa.toFixed(2)}`

  if (taxaExistente) {
    if (taxaExistente.status !== 'PAGO') {
      await prisma.lancamento.update({
        where: { id: taxaExistente.id },
        data: { valor: valorTaxa, observacoes: obs },
      })
      await prisma.faturaAdmin.updateMany({
        where: { lancamentoId: taxaExistente.id },
        data: { baseCalculo, valorTaxa, taxaPct },
      })
    }
  } else {
    const novaTaxa = await prisma.lancamento.create({
      data: {
        obraId: etapa.obraId, etapaId,
        descricao: `Taxa de Administração (${taxaPct}%) ${MARCADOR_TAXA_BENFEITORIA} ${etapa.nome}`,
        tipo: 'MAO_DE_OBRA', valor: valorTaxa, fornecedor: 'Construtora',
        status: 'APROVADO', observacoes: obs, isGlobal: false,
      },
    })
    await prisma.faturaAdmin.create({
      data: { obraId: etapa.obraId, etapaId, lancamentoId: novaTaxa.id, baseCalculo, taxaPct, valorTaxa, equalizacaoValor: 0, status: 'PENDENTE' },
    })
  }
}

/**
 * Sincroniza o status da FaturaAdmin com o status real do lançamento de taxa correspondente.
 * Chamado sempre que um lançamento de taxa (base ou de benfeitoria) é marcado como pago.
 * Corrige o bug onde a fatura ficava "Pendente" mesmo após o pagamento.
 */
export async function sincronizarStatusFatura(lancamentoTaxaId: string): Promise<void> {
  const [lancamentoTaxa, fatura] = await Promise.all([
    prisma.lancamento.findUnique({ where: { id: lancamentoTaxaId }, select: { status: true } }),
    prisma.faturaAdmin.findUnique({ where: { lancamentoId: lancamentoTaxaId } }),
  ])
  if (!lancamentoTaxa || !fatura) return

  const novoStatus = lancamentoTaxa.status === 'PAGO' ? 'PAGA' : 'PENDENTE'

  if (fatura.status !== novoStatus) {
    await prisma.faturaAdmin.update({
      where: { id: fatura.id },
      data: { status: novoStatus },
    })
  }
}

export async function calcularEqualizacaoFinal(obraId: string) {
  const obra = await prisma.obra.findUniqueOrThrow({
    where: { id: obraId },
    include: { etapas: true },
  })

  const etapasNormaisIds = obra.etapas.filter((e) => !e.eDocumentacao).map((e) => e.id)

  const lancamentosAvulsos = await prisma.lancamento.findMany({
    where: {
      obraId, etapaId: { in: etapasNormaisIds }, contratoGlobalId: null,
      isGlobal: false, status: 'PAGO', isBenfeitoria: false,
      descricao: { not: { startsWith: 'Taxa de Administração' } },
    },
    select: { valor: true },
  })

  const contratos = await prisma.contratoGlobal.findMany({
    where: { obraId },
    select: { valorTotal: true },
  })

  const custoTotal =
    lancamentosAvulsos.reduce((acc, l) => acc + l.valor, 0) +
    contratos.reduce((acc, c) => acc + c.valorTotal, 0)

  const custoRealM2 = obra.areaM2 > 0 ? custoTotal / obra.areaM2 : 0
  const referenciaM2 = obra.custoBaseReferenciaM2
  const diferenca = custoRealM2 - referenciaM2
  const valorEqualizacao = Math.abs(diferenca) * obra.areaM2

  let tipo: 'DESCONTO' | 'BONUS' | 'EQUILIBRADO' = 'EQUILIBRADO'
  if (Math.abs(diferenca) > 1) tipo = diferenca > 0 ? 'DESCONTO' : 'BONUS'

  if (tipo !== 'EQUILIBRADO') {
    await prisma.faturaAdmin.create({
      data: {
        obraId, etapaId: null, baseCalculo: custoTotal, taxaPct: 0, valorTaxa: 0,
        equalizacaoValor: tipo === 'BONUS' ? valorEqualizacao : -valorEqualizacao,
        tipoEqualizacao: tipo, status: 'PENDENTE',
      },
    })
  }

  return { custoTotal, custoRealM2, referenciaM2, diferenca, tipo, valorEqualizacao }
}

export async function getResumoFinanceiro(obraId: string) {
  const obra = await prisma.obra.findUniqueOrThrow({
    where: { id: obraId },
    include: { etapas: true },
  })

  const etapasNormaisIds = obra.etapas.filter((e) => !e.eDocumentacao).map((e) => e.id)
  const etapasDocIds = obra.etapas.filter((e) => e.eDocumentacao).map((e) => e.id)

  const lancamentosAvulsos = await prisma.lancamento.findMany({
    where: { obraId, etapaId: { in: etapasNormaisIds }, contratoGlobalId: null, isGlobal: false },
    select: { valor: true, status: true, descricao: true, tipo: true, isBenfeitoria: true, etapaId: true },
  })

  const parcelas = await prisma.lancamento.findMany({
    where: { obraId, contratoGlobalId: { not: null } },
    select: { valor: true, status: true },
  })

  const lancamentosDoc = await prisma.lancamento.findMany({
    where: { obraId, etapaId: { in: etapasDocIds } },
    select: { valor: true },
  })

  const contratos = await prisma.contratoGlobal.findMany({
    where: { obraId },
    select: { valorTotal: true, tipo: true },
  })

  const faturasAdmin = await prisma.faturaAdmin.findMany({
    where: { obraId },
    select: { valorTaxa: true, equalizacaoValor: true, etapaId: true, status: true },
  })

  // Benfeitorias (melhorias solicitadas pelo cliente fora do projeto inicial) são valores à
  // parte, como a documentação: podem ser lançadas em qualquer etapa, mas não somam no custo.
  const lancAvulsoObra = lancamentosAvulsos.filter((l) => !l.descricao.startsWith('Taxa de Administração') && !l.isBenfeitoria)
  // Taxa "base" (proporcional ao percentual da etapa) x taxa de benfeitoria (por lançamento) —
  // são cobranças independentes, cada uma com sua própria FaturaAdmin.
  const lancTaxa = lancamentosAvulsos.filter((l) => ehTaxaBase(l.descricao))
  const lancTaxaBenfeitoria = lancamentosAvulsos.filter((l) => l.descricao.startsWith('Taxa de Administração') && !ehTaxaBase(l.descricao))
  const lancBenfeitorias = lancamentosAvulsos.filter((l) => l.isBenfeitoria)

  const custoAvulso = lancAvulsoObra.reduce((acc, l) => acc + l.valor, 0)
  const custoContratos = contratos.reduce((acc, c) => acc + c.valorTotal, 0)
  const custoObra = custoAvulso + custoContratos
  const custoTaxa = lancTaxa.reduce((acc, l) => acc + l.valor, 0)
  const custoDocumentacao = lancamentosDoc.reduce((acc, l) => acc + l.valor, 0)
  const custoBenfeitorias = lancBenfeitorias.reduce((acc, l) => acc + l.valor, 0)
  const benfeitoriasPago = lancBenfeitorias.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
  const benfeitoriasPendente = lancBenfeitorias.filter((l) => l.status === 'PENDENTE').reduce((acc, l) => acc + l.valor, 0)
  const benfeitoriasAprovado = lancBenfeitorias.filter((l) => l.status === 'APROVADO').reduce((acc, l) => acc + l.valor, 0)
  const benfeitoriasMaterialPago = lancBenfeitorias.filter((l) => l.status === 'PAGO' && l.tipo === 'MATERIAL').reduce((acc, l) => acc + l.valor, 0)
  const benfeitoriasMaoDeObraPago = lancBenfeitorias.filter((l) => l.status === 'PAGO' && l.tipo === 'MAO_DE_OBRA').reduce((acc, l) => acc + l.valor, 0)

  // Custo da obra por tipo (material x mão de obra), somando avulsos + contratos
  const custoMaterial =
    lancAvulsoObra.filter((l) => l.tipo === 'MATERIAL').reduce((acc, l) => acc + l.valor, 0) +
    contratos.filter((c) => c.tipo === 'MATERIAL').reduce((acc, c) => acc + c.valorTotal, 0)
  const custoMaoDeObra =
    lancAvulsoObra.filter((l) => l.tipo === 'MAO_DE_OBRA').reduce((acc, l) => acc + l.valor, 0) +
    contratos.filter((c) => c.tipo === 'MAO_DE_OBRA').reduce((acc, c) => acc + c.valorTotal, 0)

  const totalAvulsosPago = lancAvulsoObra.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
  const totalParcelasPagas = parcelas.filter((p) => p.status === 'PAGO').reduce((acc, p) => acc + p.valor, 0)
  const totalPago = totalAvulsosPago + totalParcelasPagas
  const totalPendente = lancAvulsoObra.filter((l) => l.status === 'PENDENTE').reduce((acc, l) => acc + l.valor, 0)
  const totalAprovado = lancAvulsoObra.filter((l) => l.status === 'APROVADO').reduce((acc, l) => acc + l.valor, 0)
  const taxaAguardandoPagamento = lancTaxa.filter((l) => l.status === 'APROVADO').reduce((acc, l) => acc + l.valor, 0)

  const custoRealM2 = obra.areaM2 > 0 ? custoObra / obra.areaM2 : 0
  const referenciaM2 = obra.custoBaseReferenciaM2
  const valorVendaM2 = (obra as any).valorVendaM2 as number | null

  // Administração da construtora = (valorVendaM2 - referenciaM2) × área. É paga aos poucos,
  // etapa por etapa: cada etapa gera sua taxa "base" proporcional ao percentual da etapa
  // (ver recalcularTaxaEtapa). A taxa de benfeitoria é cobrada à parte, por lançamento, e
  // reportada apenas no dashboard próprio de benfeitorias (não soma na administração normal).
  const administracaoTotal = valorVendaM2 !== null ? (valorVendaM2 - referenciaM2) * obra.areaM2 : null
  const taxaAdminGeradaNormal = lancTaxa.reduce((acc, l) => acc + l.valor, 0)
  const taxaAdminPagaNormal = lancTaxa.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
  const taxaAdminGeradaBenfeitoria = lancTaxaBenfeitoria.reduce((acc, l) => acc + l.valor, 0)
  const taxaAdminPagaBenfeitoria = lancTaxaBenfeitoria.filter((l) => l.status === 'PAGO').reduce((acc, l) => acc + l.valor, 0)
  const administracaoRestante = administracaoTotal !== null ? administracaoTotal - taxaAdminPagaNormal : null

  const diferencaM2 = custoRealM2 - referenciaM2
  const projecaoEqualizacao = Math.abs(diferencaM2) * obra.areaM2
  const tendenciaEqualizacao: 'POSITIVO' | 'NEGATIVO' | 'EQUILIBRADO' =
    custoObra === 0 || Math.abs(diferencaM2) < 1 ? 'EQUILIBRADO'
    : diferencaM2 < 0 ? 'POSITIVO' : 'NEGATIVO'

  const equalizacaoFinal = faturasAdmin.filter((f) => f.etapaId === null).reduce((acc, f) => acc + (f.equalizacaoValor ?? 0), 0)
  const receitaTotal = valorVendaM2 ? valorVendaM2 * obra.areaM2 : null
  const margemBruta = receitaTotal ? receitaTotal - custoObra : null
  const margemPct = receitaTotal && receitaTotal > 0 ? (margemBruta! / receitaTotal) * 100 : null

  // Progresso geral da obra (soma ponderada pelo percentualObra de cada etapa)
  const etapasNormais = obra.etapas.filter((e) => !e.eDocumentacao)
  const totalPercentualObra = etapasNormais.reduce((acc, e) => acc + ((e as any).percentualObra ?? 0), 0)
  const progressoGeral = totalPercentualObra > 0
    ? etapasNormais.reduce((acc, e) => acc + (((e as any).percentualObra ?? 0) * e.percentualConclusao / 100), 0)
    : etapasNormais.length > 0
      ? etapasNormais.reduce((acc, e) => acc + e.percentualConclusao, 0) / etapasNormais.length
      : 0

  return {
    valorGlobalEstimado: obra.valorGlobalEstimado,
    custoObra, custoAvulso, custoContratos, custoTaxa, custoDocumentacao,
    custoMaterial, custoMaoDeObra,
    totalPago, totalPendente, totalAprovado, taxaAguardandoPagamento,
    percentualGasto: obra.valorGlobalEstimado > 0 ? (custoObra / obra.valorGlobalEstimado) * 100 : 0,
    custoRealM2, referenciaM2, valorVendaM2,
    administracaoTotal,
    taxaAdminGerada: taxaAdminGeradaNormal, taxaAdminPaga: taxaAdminPagaNormal,
    administracaoRestante,
    diferencaM2, tendenciaEqualizacao, projecaoEqualizacao, equalizacaoFinal,
    receitaTotal, margemBruta, margemPct,
    progressoGeral,
    // ── Benfeitorias: dashboard independente, à parte do custo/administração da obra ──
    benfeitorias: {
      custoTotal: custoBenfeitorias,
      pago: benfeitoriasPago,
      pendente: benfeitoriasPendente,
      aprovado: benfeitoriasAprovado,
      percentualPago: custoBenfeitorias > 0 ? (benfeitoriasPago / custoBenfeitorias) * 100 : 0,
      materialPago: benfeitoriasMaterialPago,
      maoDeObraPago: benfeitoriasMaoDeObraPago,
      taxaAdminGerada: taxaAdminGeradaBenfeitoria,
      taxaAdminPaga: taxaAdminPagaBenfeitoria,
    },
  }
}
