import Link from 'next/link'
import { getOrders } from '@/lib/db/orders'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils/formatters'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>
}) {
  const params = await searchParams
  const pagina = parseInt(params.pagina ?? '1')
  const perPagina = 50
  const { orders, totaal } = await getOrders(pagina, perPagina)
  const totaalPaginas = Math.ceil(totaal / perPagina)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/orders/nieuw"
          className="btn-primary">
          + Nieuwe order
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Ordernummer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Klant</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Code</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Grootte</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Datum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 font-mono text-xs font-medium">
                    {order.order_nummer}
                  </Link>
                </td>
                <td className="px-4 py-3 font-medium">{order.klant?.naam}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{order.order_code}</td>
                <td className="px-4 py-3 text-right tabular-nums">{order.order_grootte.toLocaleString('nl-NL')}</td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(order.aangemaakt_op.split('T')[0])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination pagina={pagina} totaalPaginas={totaalPaginas} basisUrl="/orders" />
    </div>
  )
}
