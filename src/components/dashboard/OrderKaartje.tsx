import type { Order } from '@/types'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

interface Props {
  order: Order
}

const STATUS_LABEL: Record<string, string> = {
  concept:        'Concept',
  bevestigd:      'Bevestigd',
  in_behandeling: 'In behandeling',
  geleverd:       'Geleverd',
  gefactureerd:   'Gefactureerd',
}

export function OrderKaartje({ order }: Props) {
  const kleur = deadlineKleur(order.deadline)

  const accentKleur =
    kleur === 'rood'   ? '#ef4444' :
    kleur === 'oranje' ? '#f59e0b' :
                         '#e5e7eb'

  const deadlineStijl =
    kleur === 'rood'
      ? { backgroundColor: '#fef2f2', color: '#dc2626' }
      : kleur === 'oranje'
      ? { backgroundColor: '#fffbeb', color: '#b45309' }
      : { color: '#9ca3af' }

  const statusKleur =
    order.status === 'in_behandeling' ? '#d97706' :
    order.status === 'bevestigd'      ? '#2563eb' :
                                         '#6b7280'

  return (
    <a
      href={`/orders/${order.id}`}
      className="block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md hover:-translate-y-px transition-all"
    >
      {/* Gekleurde urgentie-balk links */}
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: accentKleur }} />
        <div className="flex-1 px-4 py-3.5">

          {/* Ordernummer + grootte */}
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="font-mono text-sm font-bold text-gray-900">
              {order.order_nummer}
            </span>
            <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
              {formatAantal(order.order_grootte)} st.
            </span>
          </div>

          {/* Klant */}
          {order.klant && (
            <p className="text-xs text-gray-500 mb-2.5 truncate">{order.klant.naam}</p>
          )}

          {/* Status + deadline */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold" style={{ color: statusKleur }}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {order.deadline && (
                <span
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                  style={deadlineStijl}
                >
                  {formatDate(order.deadline)}
                </span>
              )}
              {order.tht && (
                <span className="text-[11px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                  THT {formatDate(order.tht)}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </a>
  )
}
