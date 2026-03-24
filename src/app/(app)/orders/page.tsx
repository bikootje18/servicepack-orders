import Link from 'next/link'
import { getOrders } from '@/lib/db/orders'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { ZoekBalk } from '@/components/orders/ZoekBalk'
import { formatDate } from '@/lib/utils/formatters'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; zoek?: string }>
}) {
  const params = await searchParams
  const pagina = parseInt(params.pagina ?? '1')
  const zoek = params.zoek ?? ''
  const perPagina = 50
  const { orders, totaal } = await getOrders(pagina, perPagina, zoek)
  const totaalPaginas = Math.ceil(totaal / perPagina)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-3">
          <ZoekBalk defaultValue={zoek} />
          <Link href="/orders/nieuw" className="btn-primary">
            + Nieuwe order
          </Link>
        </div>
      </div>

      {zoek && (
        <p className="text-sm text-gray-500 mb-4">
          {totaal} {totaal === 1 ? 'resultaat' : 'resultaten'} voor &ldquo;{zoek}&rdquo;
        </p>
      )}

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
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Geen orders gevonden{zoek ? ` voor "${zoek}"` : ''}.
                </td>
              </tr>
            )}
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/orders/${order.id}`} className="text-[#7C3AED] hover:text-[#6D28D9] font-mono text-xs font-medium">
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

      <Pagination pagina={pagina} totaalPaginas={totaalPaginas} basisUrl={zoek ? `/orders?zoek=${encodeURIComponent(zoek)}` : '/orders'} />
    </div>
  )
}
