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

  // Achtergrondkleur van de bovenste balk
  const bandKleur =
    kleur === 'rood'   ? '#dc2626' :
    kleur === 'oranje' ? '#d97706' :
    isActief           ? '#7c3aed' :
                         '#64748b'

  const bandBg =
    kleur === 'rood'   ? 'bg-red-600' :
    kleur === 'oranje' ? 'bg-amber-600' :
    isActief           ? 'bg-violet-700' :
                         'bg-slate-500'

  const deadlineStijl =
    kleur === 'rood'
      ? 'bg-red-100 text-red-700 font-bold'
      : kleur === 'oranje'
      ? 'bg-amber-100 text-amber-700 font-bold'
      : 'bg-white/20 text-white'

  return (
    <Link
      href={`/locatie/${locatie}/orders/${order.id}`}
      className="group block rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
    >
      {/* Gekleurde header band */}
      <div className={`${bandBg} px-4 py-3 flex items-center justify-between gap-3`}>
        <span className="font-mono text-[15px] font-black text-white tracking-tight leading-none truncate">
          {order.order_nummer}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {order.deadline && (
            <span className={`text-[11px] px-2 py-0.5 rounded-md ${deadlineStijl}`}>
              {formatDate(order.deadline)}
            </span>
          )}
          <span className="text-white/60 text-xs font-mono tabular-nums">
            {formatAantal(order.order_grootte)} st.
          </span>
        </div>
      </div>

      {/* Kaartbody */}
      <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl px-4 py-3">
        {order.omschrijving ? (
          <p className="text-sm text-gray-700 leading-snug line-clamp-2 mb-2">
            {order.omschrijving}
          </p>
        ) : order.bewerking ? (
          <p className="text-sm text-gray-500 mb-2">{order.bewerking}</p>
        ) : (
          <p className="text-sm text-gray-300 mb-2 italic">Geen omschrijving</p>
        )}

        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: bandKleur }}
          >
            {isActief ? 'Actief' : 'Aankomend'}
          </span>
          {order.tht && (
            <span className="text-[10px] text-gray-400">
              THT {formatDate(order.tht)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
