import Link from 'next/link'
import { getOrder } from '@/lib/db/orders'
import { getLeveringen } from '@/lib/db/leveringen'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { StatusButtons } from '@/components/orders/StatusButtons'
import { LeveringForm } from '@/components/leveringen/LeveringForm'
import { LeveringenList } from '@/components/leveringen/LeveringenList'
import { berekenResterend } from '@/lib/db/orders'
import { formatDate, formatCurrency, formatAantal } from '@/lib/utils/formatters'
import { AutoPrint } from '@/components/orders/AutoPrint'
import { PrintKnop } from '@/components/orders/PrintKnop'

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { id } = await params
  const { print } = await searchParams
  const order = await getOrder(id)
  const leveringen = await getLeveringen(id)
  const totaalGeleverd = leveringen.reduce((sum, l) => sum + l.aantal_geleverd, 0)
  const resterend = berekenResterend(order.order_grootte, totaalGeleverd)

  return (
    <div className="max-w-3xl">
      {print === '1' && <AutoPrint />}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-mono">{order.order_nummer}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-gray-500 text-sm">{order.klant?.naam} · {order.order_code}</p>
        </div>
        <div className="flex gap-2">
          <PrintKnop />
          <Link href={`/orders/${id}/bewerken`}
            className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50">
            Bewerken
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Order grootte:</span> <strong>{formatAantal(order.order_grootte)}</strong></div>
        <div><span className="text-gray-500">Geleverd:</span> <strong>{formatAantal(totaalGeleverd)}</strong></div>
        <div><span className="text-gray-500">Resterend:</span> <strong>{formatAantal(resterend)}</strong></div>
        <div><span className="text-gray-500">Facturatie code:</span> <strong className="font-mono text-xs">{order.facturatie_code?.code}</strong></div>
        <div><span className="text-gray-500">Per doos/inner/pallet:</span> <strong>{order.aantal_per_doos} / {order.aantal_per_inner} / {order.aantal_per_pallet}</strong></div>
        <div><span className="text-gray-500">Bewerking:</span> <strong>{order.bewerking || '–'}</strong></div>
        {order.omschrijving && (
          <div className="col-span-2"><span className="text-gray-500">Omschrijving:</span> {order.omschrijving}</div>
        )}
      </div>

      <StatusButtons order={order} />

      <div className="mb-6">
        <Link href={`/orders/nieuw?kloon=${id}`}
          className="text-sm text-blue-600 hover:underline">
          + Nieuwe order op basis van deze order
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-3">Gereedmeldingen</h2>
      <LeveringForm orderId={id} klantId={order.klant_id} orderGrootte={order.order_grootte} totaalGeleverd={totaalGeleverd} />
      <LeveringenList leveringen={leveringen} />
    </div>
  )
}
