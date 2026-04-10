import Link from 'next/link'
import type { Order } from '@/types'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

interface Props {
  order: Order
  locatie: string
}

export function LocatieOrderKaartje({ order, locatie }: Props) {
  const kleur = deadlineKleur(order.deadline)
  const isActief = order.status === 'in_behandeling'

  const accentKleur =
    kleur === 'rood'   ? '#ef4444' :
    kleur === 'oranje' ? '#f59e0b' :
    isActief           ? '#a78bfa' :
                         '#475569'

  const deadlinePill =
    kleur === 'rood'
      ? 'bg-red-500/20 text-red-300 font-bold'
      : kleur === 'oranje'
      ? 'bg-amber-500/20 text-amber-300 font-bold'
      : 'bg-white/8 text-gray-400'

  return (
    <Link
      href={`/locatie/${locatie}/orders/${order.id}`}
      className="group block bg-gray-900 rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:bg-gray-800 hover:-translate-y-0.5 transition-all duration-150"
    >
      <div className="flex">
        {/* Dikke accentbalk */}
        <div className="w-[4px] flex-shrink-0 rounded-l-xl" style={{ backgroundColor: accentKleur }} />

        <div className="flex-1 px-4 py-4 min-w-0">

          {/* Ordernummer + aantal */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <span className="font-mono text-[16px] font-black text-white leading-none tracking-tight">
              {order.order_nummer}
            </span>
            <span className="font-mono text-xs text-gray-500 tabular-nums flex-shrink-0 mt-0.5">
              {formatAantal(order.order_grootte)} st.
            </span>
          </div>

          {/* Omschrijving of bewerking */}
          {(order.omschrijving || order.bewerking) && (
            <p className="text-sm text-gray-400 leading-snug line-clamp-2 mb-3">
              {order.omschrijving || order.bewerking}
            </p>
          )}

          {/* Footer: status + deadline */}
          <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/6">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: accentKleur }}>
              {isActief ? '▶ Actief' : '◎ Aankomend'}
            </span>
            <div className="flex items-center gap-1.5">
              {order.tht && (
                <span className="text-[10px] text-gray-600">
                  THT {formatDate(order.tht)}
                </span>
              )}
              {order.deadline && (
                <span className={`text-[11px] px-2 py-0.5 rounded-md ${deadlinePill}`}>
                  {formatDate(order.deadline)}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </Link>
  )
}
