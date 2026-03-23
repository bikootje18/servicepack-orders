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
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
          + Nieuwe order
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Ordernummer</th>
            <th className="text-left py-2 font-medium text-gray-600">Klant</th>
            <th className="text-left py-2 font-medium text-gray-600">Order code</th>
            <th className="text-right py-2 font-medium text-gray-600">Grootte</th>
            <th className="text-left py-2 font-medium text-gray-600">Status</th>
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {order.order_nummer}
                </Link>
              </td>
              <td className="py-2">{order.klant?.naam}</td>
              <td className="py-2 font-mono text-xs text-gray-500">{order.order_code}</td>
              <td className="py-2 text-right">{order.order_grootte.toLocaleString('nl-NL')}</td>
              <td className="py-2"><StatusBadge status={order.status} /></td>
              <td className="py-2 text-gray-500">{formatDate(order.aangemaakt_op.split('T')[0])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination pagina={pagina} totaalPaginas={totaalPaginas} basisUrl="/orders" />
    </div>
  )
}
