import type { Order, Vracht } from '@/types'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate } from '@/lib/utils/formatters'
import { OrderKaartje } from './OrderKaartje'

interface Props {
  locatie: string
  label: string
  inBehandeling: Order[]
  bevestigd: Order[]
  vrachten: Vracht[]
}

function vroegsteDeadline(orders: Order[]): string | null {
  const dates = orders
    .map(o => o.deadline)
    .filter((d): d is string => !!d)
    .sort()
  return dates[0] ?? null
}

export function LocatieKolom({ label, inBehandeling, bevestigd, vrachten }: Props) {
  const alleOrders = [...inBehandeling, ...bevestigd]
  const totaalActief = inBehandeling.length
  const vroegste = vroegsteDeadline(alleOrders)
  const vroegsteKleur = vroegste ? deadlineKleur(vroegste) : null

  const deadlinePillCls =
    vroegsteKleur === 'rood'   ? 'bg-red-100 text-red-700 font-medium' :
    vroegsteKleur === 'oranje' ? 'bg-amber-100 text-amber-700 font-medium' :
                                  'bg-gray-100 text-gray-500'

  const isEmpty = inBehandeling.length === 0 && bevestigd.length === 0 && vrachten.length === 0

  return (
    <div className="flex flex-col min-h-0">
      {/* Station header */}
      <div className="bg-gray-900 rounded-t-xl px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight leading-tight">{label}</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {totaalActief === 0
              ? 'Geen actieve orders'
              : `${totaalActief} in behandeling`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {totaalActief > 0 && (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-amber-900 text-sm font-bold">
              {totaalActief}
            </span>
          )}
          {vroegste && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${deadlinePillCls}`}>
              {formatDate(vroegste)}
            </span>
          )}
        </div>
      </div>

      {/* Column body */}
      <div className="bg-gray-50 rounded-b-xl border border-gray-200 border-t-0 flex flex-col gap-0 flex-1">

        {isEmpty ? (
          <div className="flex items-center justify-center py-12 px-4">
            <p className="text-sm text-gray-400 italic">Geen orders of vrachten</p>
          </div>
        ) : (
          <>
            {/* In behandeling section */}
            {inBehandeling.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-0.5">
                  In behandeling
                </p>
                <div className="flex flex-col gap-2">
                  {inBehandeling.map(order => (
                    <OrderKaartje key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Aankomend section */}
            {bevestigd.length > 0 && (
              <div className={`p-3 ${inBehandeling.length > 0 ? 'border-t border-gray-200' : ''}`}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-0.5">
                  Aankomend
                </p>
                <div className="flex flex-col gap-2">
                  {bevestigd.map(order => (
                    <OrderKaartje key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Uitgaande vrachten section */}
            {vrachten.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-blue-50/40 rounded-b-xl">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-400 mb-2 px-0.5">
                  Uitgaande vrachten
                </p>
                <div className="flex flex-col gap-1.5">
                  {vrachten.map(vracht => (
                    <a
                      key={vracht.id}
                      href={`/vrachten/${vracht.id}`}
                      className="flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-md border border-blue-100 hover:border-blue-300 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-semibold text-blue-700 group-hover:text-blue-800 flex-shrink-0">
                          {vracht.vrachtbrief_nummer}
                        </span>
                        {vracht.klant && (
                          <span className="text-xs text-gray-500 truncate">
                            {vracht.klant.naam}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
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
