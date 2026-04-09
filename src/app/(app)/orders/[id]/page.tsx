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
import { BEDRIJF } from '@/lib/constants/bedrijf'
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

      {/* ── Print header (alleen zichtbaar bij printen) ── */}
      <div className="hidden print:flex print:items-center print:justify-between print:mb-6 print:pb-4 print:border-b-2 print:border-gray-800">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/servicepack_logo.png" alt="Service Pack b.v." className="h-12 w-auto" />
          <div>
            <p className="text-xs text-gray-500">{BEDRIJF.adres} · {BEDRIJF.postcode} {BEDRIJF.stad}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Werkorder</p>
          <p className="text-sm font-semibold text-gray-700">
            {new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ── Header ── */}
      <div className="mb-4 print:mb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-bold font-mono text-gray-900 tracking-tight">
                {order.order_nummer}
              </h1>
              <StatusBadge status={order.status} />
              {order.bio && (
                <span className="inline-flex items-center bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Bio
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
            <VerwijderOrderKnop orderId={id} orderNummer={order.order_nummer} />
          </div>
        </div>
      </div>

      {/* ── Voortgang ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm print:p-3">
        <div className="grid grid-cols-3 gap-4 mb-4 print:mb-2">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-1">Besteld</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums print:text-xl leading-none">{formatAantal(order.order_grootte)}</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-1">Gereed</p>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums print:text-xl leading-none">{formatAantal(totaalGeleverd)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-1">Resterend</p>
            <p className={`text-2xl font-bold tabular-nums print:text-xl leading-none ${resterend === 0 ? 'text-gray-300' : 'text-amber-600'}`}>
              {formatAantal(resterend)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '3px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            className={voortgang > 0 && voortgang < 100 ? 'progress-animate' : ''}
            style={{
              height: '100%',
              width: `${voortgang}%`,
              backgroundColor: voortgang === 100 ? '#10b981' : '#7c3aed',
              borderRadius: '9999px',
              transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right tabular-nums">{voortgang}% gereed</p>
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
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Locatie</p>
              <p className="font-semibold text-gray-900">{order.locatie ? locatieLabel(order.locatie) : <span className="text-gray-300">–</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Deadline</p>
              <p className="font-semibold text-gray-900">{order.deadline ? formatDate(order.deadline) : <span className="text-gray-300">–</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">THT</p>
              <p className="font-semibold text-gray-900">{order.tht ? formatDate(order.tht) : <span className="text-gray-300">–</span>}</p>
            </div>
          </div>
        </div>

        {/* Verpakking */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Verpakking</p>
          <div className="grid grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Per doos</p>
              <p className="font-semibold text-gray-900 tabular-nums">
                {order.aantal_per_doos > 0 ? formatAantal(order.aantal_per_doos) : <span className="text-gray-300">–</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Per inner</p>
              <p className="font-semibold text-gray-900 tabular-nums">
                {order.aantal_per_inner > 0 ? formatAantal(order.aantal_per_inner) : <span className="text-gray-300">–</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Per pallet</p>
              <p className="font-semibold text-gray-900 tabular-nums">
                {order.aantal_per_pallet > 0 ? formatAantal(order.aantal_per_pallet) : <span className="text-gray-300">–</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Facturatie code</p>
              {order.facturatie_code?.code
                ? <p className="font-mono text-xs font-semibold text-violet-700 bg-violet-50 inline-block px-2 py-0.5 rounded">{order.facturatie_code.code}</p>
                : <p className="text-gray-300 font-semibold">–</p>
              }
            </div>
          </div>
        </div>

        {/* Verwerking — altijd tonen */}
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Verwerking</p>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Bewerking</p>
              <p className="font-semibold text-gray-900">{order.bewerking || <span className="text-gray-300">–</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Opwerken</p>
              <p className={`font-semibold ${order.opwerken ? 'text-amber-700' : 'text-gray-300'}`}>
                {order.opwerken ? 'Ja' : 'Nee'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Bio</p>
              <p className={`font-semibold ${order.bio ? 'text-green-700' : 'text-gray-300'}`}>
                {order.bio ? 'Ja' : 'Nee'}
              </p>
            </div>
          </div>
          {order.omschrijving && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 mb-1">Omschrijving / opmerkingen</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{order.omschrijving}</p>
            </div>
          )}
          {!order.omschrijving && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-400 mb-1">Omschrijving / opmerkingen</p>
              <p className="text-sm text-gray-300">–</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Status actie ── */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <StatusButtons order={order} />
        <Link
          href={`/orders/nieuw?kloon=${id}`}
          className="text-sm text-gray-400 hover:text-violet-600 hover:underline"
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
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
          Gereedmeldingen
          {leveringen.length > 0 && (
            <span className="ml-2 font-normal normal-case text-gray-400">
              — {leveringen.length} {leveringen.length === 1 ? 'melding' : 'meldingen'}, totaal {formatAantal(totaalGeleverd)} stuks
            </span>
          )}
        </h2>
        {!isAfgerond && (
          <div className="print:hidden">
            <LeveringForm
              orderId={id}
              klantId={order.klant_id}
              orderGrootte={order.order_grootte}
              totaalGeleverd={totaalGeleverd}
            />
          </div>
        )}
        <LeveringenList leveringen={leveringen} orderId={id} />
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
