import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrder, berekenResterend } from '@/lib/db/orders'
import { getLeveringen } from '@/lib/db/leveringen'
import { getBijlagen } from '@/lib/db/bijlagen'
import { getArtikelenVoorOrder } from '@/lib/db/artikelen'
import { BijlageUpload } from '@/components/bijlagen/BijlageUpload'
import { BijlagenList } from '@/components/bijlagen/BijlagenList'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { formatDate, formatAantal } from '@/lib/utils/formatters'
import { berekenAantal } from '@/lib/utils/artikel-berekening'
import { isGeldigeLocatie } from '@/lib/db/locatie'
import { locatieMeldGereed } from '@/lib/actions/locatie'

export default async function LocatieOrderDetailPage({
  params,
}: {
  params: Promise<{ locatie: string; id: string }>
}) {
  const { locatie, id } = await params
  if (!isGeldigeLocatie(locatie)) notFound()

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
  const kanMelden = order.status === 'in_behandeling' && resterend > 0

  const vandaag = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl">

      {/* Terug */}
      <Link
        href={`/locatie/${locatie}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        ← Terug
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-black font-mono text-gray-900 tracking-tight">
              {order.order_nummer}
            </h1>
            <StatusBadge status={order.status} />
            {order.bio && (
              <span className="inline-flex items-center bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                Bio
              </span>
            )}
          </div>
          {order.order_code && (
            <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {order.order_code}
            </span>
          )}
        </div>
      </div>

      {/* Voortgang */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-1">Besteld</p>
            <p className="text-2xl font-black text-gray-900 tabular-nums leading-none">{formatAantal(order.order_grootte)}</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-1">Gereed</p>
            <p className="text-2xl font-black text-emerald-600 tabular-nums leading-none">{formatAantal(totaalGeleverd)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-1">Resterend</p>
            <p className={`text-2xl font-black tabular-nums leading-none ${resterend === 0 ? 'text-gray-300' : 'text-amber-600'}`}>
              {formatAantal(resterend)}
            </p>
          </div>
        </div>
        <div style={{ height: '4px', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${voortgang}%`,
            backgroundColor: voortgang === 100 ? '#10b981' : '#7c3aed',
            borderRadius: '9999px',
            transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right tabular-nums">{voortgang}%</p>
      </div>

      {/* Afgerond banner */}
      {isAfgerond && (
        <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <span className="text-emerald-500">✓</span>
          <p className="text-sm font-semibold text-emerald-800">
            Volledig gereedgemeld — {formatAantal(totaalGeleverd)} van {formatAantal(order.order_grootte)} stuks
          </p>
        </div>
      )}

      {/* Order details */}
      <div className="bg-white border border-gray-200 rounded-xl mb-4 shadow-sm overflow-hidden">

        {/* Logistiek */}
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Logistiek</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
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
          <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
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
              <p className="text-xs text-gray-400 mb-0.5">Dozen per pallet</p>
              <p className="font-semibold text-gray-900 tabular-nums">
                {order.aantal_per_pallet > 0 ? formatAantal(order.aantal_per_pallet) : <span className="text-gray-300">–</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Verwerking */}
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
        </div>
      </div>

      {/* Gereedmelding formulier */}
      {kanMelden && (
        <div className="bg-white border border-violet-200 rounded-xl mb-4 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-violet-50 border-b border-violet-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Gereedmelding</p>
          </div>
          <form action={locatieMeldGereed} className="px-5 py-4 space-y-4">
            <input type="hidden" name="order_id" value={id} />
            <input type="hidden" name="locatie" value={locatie} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Aantal gereed <span className="text-violet-600">*</span>
                </label>
                <input
                  type="number"
                  name="aantal_geleverd"
                  min={1}
                  max={resterend}
                  defaultValue={resterend}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
                <p className="text-[10px] text-gray-400 mt-1">Max. {formatAantal(resterend)} resterend</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Datum <span className="text-violet-600">*</span>
                </label>
                <input
                  type="date"
                  name="leverdatum"
                  defaultValue={vandaag}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                THT <span className="text-gray-400 font-normal">(optioneel)</span>
              </label>
              <input
                type="date"
                name="tht"
                defaultValue={order.tht ?? ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Opmerkingen <span className="text-gray-400 font-normal">(optioneel)</span>
              </label>
              <textarea
                name="notities"
                rows={2}
                placeholder="Bijv. partij informatie, afwijkingen…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-6 rounded-lg text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 active:bg-violet-800 transition-colors"
            >
              Gereedmelding opslaan
            </button>
          </form>
        </div>
      )}

      {/* Eerdere gereedmeldingen */}
      {leveringen.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            Eerdere meldingen
          </p>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-50">
            {leveringen.map(l => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-mono text-sm font-semibold text-gray-900">{formatAantal(l.aantal_geleverd)} st.</span>
                  {l.notities && <span className="text-xs text-gray-400 ml-2">{l.notities}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {l.tht && <span>THT {formatDate(l.tht)}</span>}
                  <span>{formatDate(l.leverdatum)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Artikelen */}
      {artikelen.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Artikelen</p>
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
                        {a.berekening_type === 'delen' ? `÷ ${a.factor}` : `× ${a.factor}`}
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

      {/* Bijlagen */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Bijlagen</p>
        <BijlagenList bijlagen={bijlagen} orderId={id} />
        <div className={bijlagen.length > 0 ? 'mt-3' : ''}>
          <BijlageUpload orderId={id} />
        </div>
      </div>

    </div>
  )
}
