// src/app/(dashboard)/clientes/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'
import { NovoClienteForm } from '@/components/dashboard/novo-cliente-form'

export default async function ClientesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const clientes = await prisma.cliente.findMany({
    where: { ativo: true },
    include: {
      _count: { select: { obras: true } },
      obras: {
        select: { status: true },
      },
    },
    orderBy: { nome: 'asc' },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-concrete-900">Clientes</h1>
          <p className="text-concrete-500 text-sm mt-1">{clientes.length} clientes cadastrados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-concrete-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Contato</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Obras</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-concrete-400 uppercase tracking-wider">Desde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-concrete-100">
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-concrete-400">
                      Nenhum cliente cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c) => {
                    const obrasAtivas = c.obras.filter((o) => o.status === 'EM_ANDAMENTO').length
                    return (
                      <tr key={c.id} className="hover:bg-concrete-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-brand-700 font-semibold text-sm">{c.nome[0]}</span>
                            </div>
                            <div>
                              <p className="font-medium text-concrete-900 text-sm">{c.nome}</p>
                              {c.cpfCnpj && <p className="text-xs text-concrete-400">{c.cpfCnpj}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-concrete-700">{c.email}</p>
                          <p className="text-xs text-concrete-400 mt-0.5">{c.whatsapp}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-concrete-900">{c._count.obras}</span>
                            {obrasAtivas > 0 && (
                              <span className="badge bg-blue-100 text-blue-700 text-xs">
                                {obrasAtivas} ativa{obrasAtivas > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-concrete-500">{formatDate(c.createdAt)}</p>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formulário de novo cliente */}
        <div>
          <NovoClienteForm />
        </div>
      </div>
    </div>
  )
}
