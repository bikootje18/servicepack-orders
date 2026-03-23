import Link from 'next/link'
import { getOrders } from '@/lib/db/orders'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

export default async function DashboardPage() {
  const { orders } = await getOrders(1, 20)
  const actief = orders.filter(o => o.status !== 'gefactureerd')
  const teFactureren = orders.filter(o => o.status === 'geleverd')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {teFactureren.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-yellow-800 mb-2">
            {teFactureren.length} order{teFactureren.length > 1 ? 's' : ''} wacht{teFactureren.length === 1 ? '' : 'en'} op facturatie
          </p>
          {teFactureren.map(o => (
            <Link key={o.id} href={`/orders/${o.id}`}
              className="text-sm text-yellow-700 hover:underline block">
              {o.order_nummer} – {o.klant?.naam}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Actieve orders</h2>
        <Link href="/orders/nieuw"
          className="btn-primary">
          + Nieuwe order
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-left py-2 font-medium text-gray-600">Klant</th>
            <th className="text-right py-2 font-medium text-gray-600">Grootte</th>
            <th className="text-left py-2 font-medium text-gray-600">Status</th>
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
          </tr>
        </thead>
        <tbody>
          {actief.map(order => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {order.order_nummer}
                </Link>
              </td>
              <td className="py-2">{order.klant?.naam}</td>
              <td className="py-2 text-right">{formatAantal(order.order_grootte)}</td>
              <td className="py-2"><StatusBadge status={order.status} /></td>
              <td className="py-2 text-gray-500">{formatDate(order.aangemaakt_op.split('T')[0])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
