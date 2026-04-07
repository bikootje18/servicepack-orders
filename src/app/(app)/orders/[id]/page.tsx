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
import { formatDate, formatAantal } from '@/lib/utils/formatters'
import { berekenAantal } from '@/lib/utils/artikel-berekening'
import { locatieLabel } from '@/lib/constants/locaties'
import { AutoPrint } from '@/components/orders/AutoPrint'
import { PrintKnop } from '@/components/orders/PrintKnop'
import { VerwijderOrderKnop } from '@/components/orders/VerwijderOrderKnop'

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
  const voortgang = order.order_grootte > 0
    ? Math.min(100, Math.round((totaalGeleverd / order.order_grootte) * 100))
    : 0
  const isAfgerond = order.status === 'geleverd' || order.status === 'gefactureerd'

  return (
    <div className="max-w-4xl">
      {print === '1' && <AutoPrint />}

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-bold font-mono text-gray-900 tracking-tight">
                {order.order_nummer}
              </h1>
              <StatusBadge status={order.status} />
              {order.bio && (
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  🌿 Bio
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">
              <span className="font-medium text-gray-700">{order.klant?.naam}</span>
              {order.order_code && (
                <>
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {order.order_code}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
            <PrintKnop />
            <Link
              href={`/orders/${id}/bewerken`}
              className="text-sm border border-gray-300 px-3 py-1.5 rounded-md hover:bg-gray-50 text-gray-700 font-medium"
            >
              Bewerken
            </Link>
            <VerwijderOrderKnop orderId={id} />
          </div>
        </div>
      </div>

      {/* ── Voortgang ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Besteld</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatAantal(order.order_grootte)}</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Gereed</p>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{formatAantal(totaalGeleverd)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Resterend</p>
            <p className={`text-2xl font-bold tabular-nums ${resterend === 0 ? 'text-gray-400' : 'text-amber-600'}`}>
              {formatAantal(resterend)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${voortgang === 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
            style={{ width: `${voortgang}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">{voortgang}% gereed</p>
      </div>

      {/* ── Afgerond banner ── */}
      {isAfgerond && (
        <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <span className="text-emerald-500 text-lg">✓</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              {order.status === 'gefactureerd' ? 'Gefactureerd' : 'Volledig geleverd'}
            </p>
            <p className="text-xs text-emerald-600">
              {formatAantal(totaalGeleverd)} van {formatAantal(order.order_grootte)} eenheden gereedgemeld
            </p>
          </div>
        </div>
      )}

      {/* ── Order details ── */}
      <div className="bg-white border border-gray-200 rounded-xl mb-4 shadow-sm overflow-hidden">

        {/* Logistiek */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Logistiek</p>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
            {order.locatie && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Locatie</p>
                <p className="font-semibold text-gray-900">{locatieLabel(order.locatie)}</p>
              </div>
            )}
            {order.deadline && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
                <p className="font-semibold text-gray-900">{formatDate(order.deadline)}</p>
              </div>
            )}
            {order.tht && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">THT</p>
                <p className="font-semibold text-gray-900">{formatDate(order.tht)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Verpakking */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Verpakking</p>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Per doos</p>
              <p className="font-semibold text-gray-900 tabular-nums">
                {order.aantal_per_doos > 0 ? formatAantal(order.aantal_per_doos) : '–'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Per inner</p>
              <p className="font-semibold text-gray-900 tabular-nums">
                {order.aantal_per_inner > 0 ? formatAantal(order.aantal_per_inner) : '–'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Per pallet</p>
              <p className="font-semibold text-gray-900 tabular-nums">
                {order.aantal_per_pallet > 0 ? formatAantal(order.aantal_per_pallet) : '–'}
              </p>
            </div>
            {order.facturatie_code?.code && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Facturatie code</p>
                <p className="font-mono text-xs font-semibold text-violet-700 bg-violet-50 inline-block px-2 py-0.5 rounded">
                  {order.facturatie_code.code}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Verwerking */}
        {(order.bewerking || order.opwerken || order.omschrijving) && (
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Verwerking</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {order.bewerking && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Bewerking</p>
                  <p className="font-semibold text-gray-900">{order.bewerking}</p>
                </div>
              )}
              {order.opwerken && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Opwerken</p>
                  <p className="font-semibold text-amber-700">Ja</p>
                </div>
              )}
              {order.omschrijving && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 mb-0.5">Omschrijving</p>
                  <p className="text-gray-700 leading-relaxed">{order.omschrijving}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Status actie ── */}
      <div className="flex items-center justify-between mb-6">
        <StatusButtons order={order} />
        <Link
          href={`/orders/nieuw?kloon=${id}`}
          className="text-sm text-gray-400 hover:text-violet-600 hover:underline print:hidden"
        >
          + Kloon deze order
        </Link>
      </div>

      {/* ── Artikelen ── */}
      {artikelen.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Artikelen</h2>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">Naam</th>
                  <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">Berekening</th>
                  <th className="text-right px-5 py-3 font-semibold text-xs text-gray-500">Aantal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {artikelen.map(a => {
                  const aantal = berekenAantal(order.order_grootte, a.berekening_type, a.factor)
                  return (
                    <tr key={a.id}>
                      <td className="px-5 py-3 font-mono text-xs font-medium text-gray-800">{a.naam}</td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {a.berekening_type === 'delen'
                          ? `÷ ${a.factor}`
                          : `× ${a.factor}`}
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums text-gray-900">
                        {aantal != null ? formatAantal(aantal) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Gereedmeldingen ── */}
      <div className="mb-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Gereedmeldingen</h2>
        {!isAfgerond && (
          <LeveringForm
            orderId={id}
            klantId={order.klant_id}
            orderGrootte={order.order_grootte}
            totaalGeleverd={totaalGeleverd}
          />
        )}
        <LeveringenList leveringen={leveringen} />
      </div>

      {/* ── Bijlagen ── */}
      <div className="mb-6 print:hidden">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Bijlagen</h2>
        <BijlagenList bijlagen={bijlagen} orderId={id} />
        <div className={bijlagen.length > 0 ? 'mt-3' : ''}>
          <BijlageUpload orderId={id} />
        </div>
      </div>
    </div>
  )
}
