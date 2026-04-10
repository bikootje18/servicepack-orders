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
    kleur === 'rood'   ? '#dc2626' :
    kleur === 'oranje' ? '#d97706' :
    isActief           ? '#7c3aed' :
                         '#94a3b8'

  const cardRing =
    kleur === 'rood'
      ? 'border-red-200 bg-red-50/40'
      : 'border-gray-200 bg-white'

  const deadlineBg =
    kleur === 'rood'
      ? 'bg-red-100 text-red-700'
      : kleur === 'oranje'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-500'

  return (
    <Link
      href={`/locatie/${locatie}/orders/${order.id}`}
      className={`group flex rounded-xl border overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 ${cardRing}`}
    >
      {/* Dikke accentbalk */}
      <div className="w-[5px] flex-shrink-0" style={{ backgroundColor: accentKleur }} />

      <div className="flex-1 px-5 py-4 min-w-0">

        {/* Boven: ordernummer + aantal */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="font-mono text-[17px] font-black text-gray-900 tracking-tight leading-none">
            {order.order_nummer}
          </span>
          <span className="font-mono text-xs font-semibold text-gray-400 tabular-nums flex-shrink-0 mt-0.5">
            {formatAantal(order.order_grootte)} st.
          </span>
        </div>

        {/* Omschrijving */}
        {order.omschrijving && (
          <p className="text-sm text-gray-600 leading-snug line-clamp-2 mb-3">
            {order.omschrijving}
          </p>
        )}

        {/* Bewerking */}
        {order.bewerking && !order.omschrijving && (
          <p className="text-xs text-gray-400 mb-3">{order.bewerking}</p>
        )}

        {/* Onder: status + deadline */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-gray-100">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: accentKleur }}
          >
            {isActief ? 'Actief' : 'Aankomend'}
          </span>

          <div className="flex items-center gap-1.5">
            {order.tht && (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                THT {formatDate(order.tht)}
              </span>
            )}
            {order.deadline && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${deadlineBg}`}>
                {formatDate(order.deadline)}
              </span>
            )}
          </div>
        </div>

      </div>
    </Link>
  )
}
