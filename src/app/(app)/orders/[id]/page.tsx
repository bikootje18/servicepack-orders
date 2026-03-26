import Link from 'next/link'
import { getOrder } from '@/lib/db/orders'
import { getLeveringen } from '@/lib/db/leveringen'
import { getBijlagen } from '@/lib/db/bijlagen'
import { getArtikelenVoorOrder } from '@/lib/db/artikelen'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { StatusButtons } from '@/components/orders/StatusButtons'
import { LeveringForm } from '@/components/leveringen/LeveringForm'
import { LeveringenList } from '@/components/leveringen/LeveringenList'
import { BijlageUpload } from '@/components/bijlagen/BijlageUpload'
import { BijlagenList } from '@/components/bijlagen/BijlagenList'
import { berekenResterend } from '@/lib/db/orders'
import { formatDate, formatCurrency, formatAantal } from '@/lib/utils/formatters'
import { berekenAantal } from '@/lib/utils/artikel-berekening'
import { locatieLabel } from '@/lib/constants/locaties'
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
  const [leveringen, bijlagen, artikelen] = await Promise.all([
    getLeveringen(id),
    getBijlagen(id),
    getArtikelenVoorOrder(id),
  ])
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
        {order.bio && (
          <div><span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded">🌿 Bio</span></div>
        )}
        {order.locatie && (
          <div><span className="text-gray-500">Locatie:</span> <strong>{locatieLabel(order.locatie)}</strong></div>
        )}
        {order.deadline && (
          <div><span className="text-gray-500">Deadline:</span> <strong>{formatDate(order.deadline)}</strong></div>
        )}
        {order.tht && (
          <div><span className="text-gray-500">THT:</span> <strong>{formatDate(order.tht)}</strong></div>
        )}
        {order.omschrijving && (
          <div className="col-span-2"><span className="text-gray-500">Omschrijving:</span> {order.omschrijving}</div>
        )}
      </div>

      <StatusButtons order={order} />

      {/* Afgerond banner */}
      {(order.status === 'geleverd' || order.status === 'gefactureerd') && (
        <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <span className="text-green-600 text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-green-800">
              {order.status === 'gefactureerd' ? 'Gefactureerd' : 'Volledig geleverd'}
            </p>
            <p className="text-xs text-green-600">
              {formatAantal(totaalGeleverd)} van {formatAantal(order.order_grootte)} eenheden geleverd
            </p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Link href={`/orders/nieuw?kloon=${id}`}
          className="text-sm text-blue-600 hover:underline">
          + Nieuwe order op basis van deze order
        </Link>
      </div>

      {artikelen.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Artikelen</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 font-medium text-gray-500 text-xs">Naam</th>
                <th className="text-left pb-2 font-medium text-gray-500 text-xs">Type</th>
                <th className="text-left pb-2 font-medium text-gray-500 text-xs">Factor</th>
                <th className="text-right pb-2 font-medium text-gray-500 text-xs">Aantal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {artikelen.map(a => {
                const aantal = berekenAantal(order.order_grootte, a.berekening_type, a.factor)
                return (
                  <tr key={a.id}>
                    <td className="py-1.5 font-mono text-xs">{a.naam}</td>
                    <td className="py-1.5 text-gray-500 text-xs capitalize">{a.berekening_type}</td>
                    <td className="py-1.5 text-gray-500 text-xs">{a.factor}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium">{aantal ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Gereedmeldingen</h2>
      {order.status !== 'geleverd' && order.status !== 'gefactureerd' && (
        <LeveringForm orderId={id} klantId={order.klant_id} orderGrootte={order.order_grootte} totaalGeleverd={totaalGeleverd} />
      )}
      <LeveringenList leveringen={leveringen} />

      <h2 className="text-lg font-semibold mb-3 mt-8">Bijlagen</h2>
      <BijlagenList bijlagen={bijlagen} orderId={id} />
      <div className={bijlagen.length > 0 ? 'mt-3' : ''}>
        <BijlageUpload orderId={id} />
      </div>
    </div>
  )
}
