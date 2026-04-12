import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrder, berekenResterend } from '@/lib/db/orders'
import { getLeveringen } from '@/lib/db/leveringen'
import { getBijlagen } from '@/lib/db/bijlagen'
import { getArtikelenVoorOrder } from '@/lib/db/artikelen'
import { BijlageUpload } from '@/components/bijlagen/BijlageUpload'
import { BijlagenList } from '@/components/bijlagen/BijlagenList'
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
  const kanMelden = !isAfgerond && resterend > 0
  const vandaag = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl">

      {/* Terug */}
      <Link
        href={`/locatie/${locatie}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        ← {locatie}
      </Link>

      {/* Order header — donkere kaart */}
      <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: '#111827', boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="font-mono text-2xl font-black text-white tracking-tight leading-none mb-1.5">
              {order.order_nummer}
            </p>
            {order.order_code && (
              <span className="font-mono text-xs text-gray-500 bg-white/8 px-2 py-0.5 rounded">
                {order.order_code}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {order.bio && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                Bio
              </span>
            )}
            {order.opwerken && (
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                Opwerken
              </span>
            )}
          </div>
        </div>

        {/* Voortgang */}
        <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-y border-white/8">
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Besteld</p>
            <p className="text-xl font-black text-white tabular-nums leading-none">{formatAantal(order.order_grootte)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Gereed</p>
            <p className="text-xl font-black text-emerald-400 tabular-nums leading-none">{formatAantal(totaalGeleverd)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Resterend</p>
            <p className={`text-xl font-black tabular-nums leading-none ${resterend === 0 ? 'text-gray-600' : 'text-amber-400'}`}>
              {formatAantal(resterend)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${voortgang}%`,
                backgroundColor: voortgang === 100 ? '#34d399' : '#a78bfa',
              }}
            />
          </div>
          <p className="text-[10px] text-gray-600 mt-1 text-right tabular-nums">{voortgang}%</p>
        </div>

        {isAfgerond && (
          <div className="mt-4 flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-2.5">
            <span className="text-emerald-400 font-bold">✓</span>
            <p className="text-sm font-semibold text-emerald-300">Volledig gereedgemeld</p>
          </div>
        )}
      </div>

      {/* Order details — lichte kaart */}
      <div className="bg-white border border-gray-200 rounded-2xl mb-4 shadow-sm overflow-hidden">

        {/* Logistiek + Verpakking samen */}
        <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-4 border-b border-gray-100">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2.5">Logistiek</p>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">Deadline</p>
                <p className="text-sm font-bold text-gray-900">{order.deadline ? formatDate(order.deadline) : <span className="text-gray-300">–</span>}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-0.5">THT</p>
                <p className="text-sm font-bold text-gray-900">{order.tht ? formatDate(order.tht) : <span className="text-gray-300">–</span>}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2.5">Verpakking</p>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {order.aantal_per_doos > 0 ? formatAantal(order.aantal_per_doos) : <span className="text-gray-300">–</span>}
                </span>
                <span className="text-[10px] text-gray-400">per doos</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {order.aantal_per_inner > 0 ? formatAantal(order.aantal_per_inner) : <span className="text-gray-300">–</span>}
                </span>
                <span className="text-[10px] text-gray-400">per inner</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-gray-900 tabular-nums">
                  {order.aantal_per_pallet > 0 ? formatAantal(order.aantal_per_pallet) : <span className="text-gray-300">–</span>}
                </span>
                <span className="text-[10px] text-gray-400">dozen per pallet</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verwerking */}
        <div className="px-5 py-4">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2.5">Verwerking</p>
          <div className="flex gap-6 mb-3">
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Bewerking</p>
              <p className="text-sm font-semibold text-gray-900">{order.bewerking || <span className="text-gray-300">–</span>}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Opwerken</p>
              <p className={`text-sm font-bold ${order.opwerken ? 'text-amber-600' : 'text-gray-300'}`}>
                {order.opwerken ? 'Ja' : 'Nee'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">Bio</p>
              <p className={`text-sm font-bold ${order.bio ? 'text-emerald-600' : 'text-gray-300'}`}>
                {order.bio ? 'Ja' : 'Nee'}
              </p>
            </div>
          </div>
          {order.omschrijving && (
            <div className="bg-gray-50 rounded-lg px-3 py-2.5">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{order.omschrijving}</p>
            </div>
          )}
        </div>
      </div>

      {/* Artikelen */}
      {artikelen.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl mb-4 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">Artikelen</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {artikelen.map(a => {
                const aantal = berekenAantal(order.order_grootte, a.berekening_type, a.factor)
                return (
                  <tr key={a.id}>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-gray-700">{a.naam}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {a.berekening_type === 'delen' ? `÷ ${a.factor}` : `× ${a.factor}`}
                    </td>
                    <td className="px-5 py-3 text-right font-black tabular-nums text-gray-900">
                      {aantal != null ? formatAantal(aantal) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Gereedmelding formulier */}
      {kanMelden && (
        <div className="bg-white border border-gray-200 rounded-2xl mb-4 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">Gereedmelding</p>
            <p className="text-xs text-gray-400 mt-1">
              Nog <span className="font-bold text-amber-600">{formatAantal(resterend)} stuks</span> resterend
            </p>
          </div>
          <form action={locatieMeldGereed} className="px-5 py-4 space-y-4">
            <input type="hidden" name="order_id" value={id} />
            <input type="hidden" name="locatie" value={locatie} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Aantal gereed
                </label>
                <input
                  type="number"
                  name="aantal_geleverd"
                  min={1}
                  max={resterend}
                  defaultValue={resterend}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Datum
                </label>
                <input
                  type="date"
                  name="leverdatum"
                  defaultValue={vandaag}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Uren <span className="text-gray-300 normal-case tracking-normal font-normal">(optioneel)</span>
              </label>
              <input
                type="number"
                name="uren"
                min={0.25}
                step={0.25}
                placeholder="bijv. 3.5"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                THT <span className="text-gray-300 normal-case tracking-normal font-normal">(optioneel)</span>
              </label>
              <input
                type="date"
                name="tht"
                defaultValue={order.tht ?? ''}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                Opmerkingen <span className="text-gray-300 normal-case tracking-normal font-normal">(optioneel)</span>
              </label>
              <textarea
                name="notities"
                rows={2}
                placeholder="Bijv. partij info, afwijkingen…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-sm font-black bg-gray-900 text-white hover:bg-gray-700 active:bg-black transition-colors tracking-wide"
            >
              Gereedmelding opslaan
            </button>
          </form>
        </div>
      )}

      {/* Eerdere gereedmeldingen */}
      {leveringen.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl mb-4 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-1">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">Eerdere meldingen</p>
          </div>
          <div className="divide-y divide-gray-50">
            {leveringen.map(l => (
              <div key={l.id} className="flex items-center justify-between px-5 py-3">
                <span className="font-mono text-sm font-bold text-gray-900">{formatAantal(l.aantal_geleverd)} st.</span>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {l.uren != null && <span className="font-semibold text-gray-600">{l.uren}u</span>}
                  {l.tht && <span>THT {formatDate(l.tht)}</span>}
                  {l.notities && <span className="italic">{l.notities}</span>}
                  <span>{formatDate(l.leverdatum)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bijlagen */}
      <div className="bg-white border border-gray-200 rounded-2xl mb-6 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 mb-3">Bijlagen</p>
          <BijlagenList bijlagen={bijlagen} orderId={id} />
          <div className={bijlagen.length > 0 ? 'mt-3' : ''}>
            <BijlageUpload orderId={id} />
          </div>
        </div>
      </div>

    </div>
  )
}
