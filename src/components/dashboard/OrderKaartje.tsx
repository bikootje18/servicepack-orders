import type { Order } from '@/types'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

interface Props {
  order: Order
}

export function OrderKaartje({ order }: Props) {
  const kleur = deadlineKleur(order.deadline)

  const deadlineBg =
    kleur === 'rood'   ? 'bg-red-100 text-red-700 font-semibold' :
    kleur === 'oranje' ? 'bg-amber-100 text-amber-700 font-semibold' :
                         'text-gray-500'

  return (
    <a
      href={`/orders/${order.id}`}
      className="block bg-white border border-gray-200 rounded-lg px-3.5 py-3 hover:border-gray-400 hover:shadow-sm transition-all group"
    >
      {/* Top row: order number + grootte */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-mono text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-tight">
          {order.order_nummer}
        </span>
        <span className="text-xs text-gray-400 tabular-nums flex-shrink-0 mt-0.5">
          {formatAantal(order.order_grootte)} st.
        </span>
      </div>

      {/* Client name */}
      {order.klant && (
        <p className="text-xs text-gray-600 mb-2 leading-tight truncate">
          {order.klant.naam}
        </p>
      )}

      {/* Status + deadline row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <StatusBadge status={order.status} />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {order.deadline && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${deadlineBg}`}>
              {formatDate(order.deadline)}
            </span>
          )}
          {order.tht && (
            <span className="text-xs text-gray-400 px-1.5 py-0.5 rounded bg-gray-50">
              THT {formatDate(order.tht)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
