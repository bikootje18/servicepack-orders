import type { Order, Vracht } from '@/types'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate } from '@/lib/utils/formatters'
import { OrderKaartje } from './OrderKaartje'

interface Props {
  locatie: string
  label: string
  index: number
  inBehandeling: Order[]
  bevestigd: Order[]
  vrachten: Vracht[]
}

// Per-locatie accent kleuren
const ACCENT = [
  { bar: 'bg-blue-500',   badge: 'bg-blue-500 text-white',   section: 'text-blue-600',  vracht: 'bg-blue-50 border-blue-100' },
  { bar: 'bg-emerald-500', badge: 'bg-emerald-500 text-white', section: 'text-emerald-600', vracht: 'bg-emerald-50 border-emerald-100' },
  { bar: 'bg-violet-500', badge: 'bg-violet-500 text-white', section: 'text-violet-600', vracht: 'bg-violet-50 border-violet-100' },
]

function vroegsteDeadline(orders: Order[]): string | null {
  const dates = orders
    .map(o => o.deadline)
    .filter((d): d is string => !!d)
    .sort()
  return dates[0] ?? null
}

export function LocatieKolom({ label, index, inBehandeling, bevestigd, vrachten }: Props) {
  const accent = ACCENT[index] ?? ACCENT[0]
  const alleOrders = [...inBehandeling, ...bevestigd]
  const totaalActief = inBehandeling.length
  const vroegste = vroegsteDeadline(alleOrders)
  const vroegsteKleur = vroegste ? deadlineKleur(vroegste) : null
  const isEmpty = inBehandeling.length === 0 && bevestigd.length === 0 && vrachten.length === 0

  const deadlineChipCls =
    vroegsteKleur === 'rood'   ? 'bg-red-500 text-white' :
    vroegsteKleur === 'oranje' ? 'bg-amber-400 text-amber-900' :
                                  'bg-slate-200 text-slate-600'

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
      {/* Gekleurde top-bar */}
      <div className={`h-1.5 ${accent.bar}`} />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900 leading-tight">{label}</h2>
          {totaalActief > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-bold flex-shrink-0 ${accent.badge}`}>
              {totaalActief}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="text-sm text-slate-400">
            {totaalActief === 0 ? 'Geen actieve orders' : `${totaalActief} actief`}
            {bevestigd.length > 0 && ` · ${bevestigd.length} aankomend`}
          </span>
          {vroegste && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${deadlineChipCls}`}>
              {formatDate(vroegste)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <span className="text-slate-400 text-lg">·</span>
            </div>
            <p className="text-sm font-medium text-slate-400">Niets gepland</p>
          </div>
        ) : (
          <>
            {/* In behandeling */}
            {inBehandeling.length > 0 && (
              <div className="px-4 pt-4 pb-3">
                <p className={`text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5 ${accent.section}`}>
                  In behandeling
                </p>
                <div className="flex flex-col gap-2">
                  {inBehandeling.map(order => (
                    <OrderKaartje key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Aankomend */}
            {bevestigd.length > 0 && (
              <div className={`px-4 pt-3 pb-3 ${inBehandeling.length > 0 ? 'border-t border-slate-100' : 'pt-4'}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5 text-slate-400">
                  Aankomend
                </p>
                <div className="flex flex-col gap-2">
                  {bevestigd.map(order => (
                    <OrderKaartje key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Vrachten */}
            {vrachten.length > 0 && (
              <div className={`px-4 pt-3 pb-4 border-t border-slate-100 ${accent.vracht} mx-0`}>
                <p className={`text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5 ${accent.section}`}>
                  Uitgaande vrachten
                </p>
                <div className="flex flex-col gap-1.5">
                  {vrachten.map(vracht => (
                    <a
                      key={vracht.id}
                      href={`/vrachten/${vracht.id}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {vracht.vrachtbrief_nummer}
                        </span>
                        {vracht.klant && (
                          <span className="text-xs text-slate-400 truncate">
                            {vracht.klant.naam}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                        {formatDate(vracht.datum)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
