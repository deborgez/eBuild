// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Usuário admin
  const senhaHash = await bcrypt.hash('admin123', 12)
  await prisma.usuario.upsert({
    where: { email: 'admin@construtora.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@construtora.com',
      senha: senhaHash,
      role: 'ADMIN',
    },
  })

  // Cliente demo
  const cliente = await prisma.cliente.create({
    data: {
      nome: 'Maria Silva',
      email: 'maria@email.com',
      whatsapp: '5511999990000',
      cpfCnpj: '123.456.789-00',
    },
  })

  // Obra demo
  const obra = await prisma.obra.create({
    data: {
      clienteId: cliente.id,
      nome: 'Residência Silva — Alphaville',
      endereco: 'Rua das Palmeiras, 123 — Alphaville, SP',
      areaM2: 280,
      prazoMeses: 18,
      valorGlobalEstimado: 850000,
      custoBaseReferenciaM2: 2100,
      taxaAdministracaoPct: 16,
      status: 'EM_ANDAMENTO',
      dataInicio: new Date(),
    },
  })

  // Etapas
  const etapas = await Promise.all([
    prisma.etapa.create({
      data: {
        obraId: obra.id,
        nome: 'Etapa 01 — Fundação',
        ordem: 1,
        percentualConclusao: 100,
        status: 'CONCLUIDA',
      },
    }),
    prisma.etapa.create({
      data: {
        obraId: obra.id,
        nome: 'Etapa 02 — Estrutura',
        ordem: 2,
        percentualConclusao: 60,
        status: 'EM_ANDAMENTO',
      },
    }),
    prisma.etapa.create({
      data: {
        obraId: obra.id,
        nome: 'Etapa 03 — Alvenaria',
        ordem: 3,
        percentualConclusao: 0,
        status: 'PENDENTE',
      },
    }),
    prisma.etapa.create({
      data: {
        obraId: obra.id,
        nome: 'Documentação / Taxas Extras',
        ordem: 99,
        eDocumentacao: true,
        status: 'EM_ANDAMENTO',
      },
    }),
  ])

  // Lançamentos demo
  await prisma.lancamento.createMany({
    data: [
      {
        obraId: obra.id,
        etapaId: etapas[0].id,
        descricao: 'Concreto usinado — fundação',
        tipo: 'MATERIAL',
        valor: 28000,
        fornecedor: 'Concretex Ltda',
        status: 'PAGO',
      },
      {
        obraId: obra.id,
        etapaId: etapas[0].id,
        descricao: 'Mão de obra — equipe fundação',
        tipo: 'MAO_DE_OBRA',
        valor: 15000,
        fornecedor: 'Constru Team',
        status: 'PAGO',
      },
      {
        obraId: obra.id,
        etapaId: etapas[1].id,
        descricao: 'Aço CA-50 — vigas e pilares',
        tipo: 'MATERIAL',
        valor: 42000,
        fornecedor: 'Aços Brasil',
        status: 'APROVADO',
      },
      {
        obraId: obra.id,
        etapaId: etapas[1].id,
        descricao: 'Serviço de concretagem — laje',
        tipo: 'MAO_DE_OBRA',
        valor: 18500,
        fornecedor: 'Obras & Cia',
        status: 'PENDENTE',
      },
      {
        obraId: obra.id,
        etapaId: etapas[3].id,
        descricao: 'Taxa de aprovação — Prefeitura',
        tipo: 'MATERIAL',
        valor: 3200,
        fornecedor: 'Prefeitura Municipal',
        status: 'PAGO',
      },
    ],
  })

  console.log('✅ Seed concluído com sucesso!')
  console.log('📧 Login: admin@construtora.com | Senha: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
