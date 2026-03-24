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

  const borderCls =
    kleur === 'rood'   ? 'border-l-red-500' :
    kleur === 'oranje' ? 'border-l-amber-400' :
                         'border-l-slate-200'

  const deadlineCls =
    kleur === 'rood'   ? 'bg-red-50 text-red-600 font-semibold' :
    kleur === 'oranje' ? 'bg-amber-50 text-amber-700 font-semibold' :
                         'text-slate-400'

  const statusCls =
    order.status === 'in_behandeling' ? 'text-amber-600' :
    order.status === 'bevestigd'      ? 'text-blue-600'  :
                                         'text-slate-400'

  return (
    <a
      href={`/orders/${order.id}`}
      className={`block bg-white border border-slate-200 border-l-4 ${borderCls} rounded-lg px-3.5 py-3 hover:shadow-md hover:-translate-y-px transition-all`}
    >
      {/* Top: order number + grootte */}
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-mono text-sm font-bold text-slate-900 leading-tight">
          {order.order_nummer}
        </span>
        <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
          {formatAantal(order.order_grootte)} st.
        </span>
      </div>

      {/* Client */}
      {order.klant && (
        <p className="text-xs text-slate-500 mb-2.5 truncate leading-tight">
          {order.klant.naam}
        </p>
      )}

      {/* Bottom row: status + deadline + THT */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-semibold ${statusCls}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>

        <div className="flex items-center gap-1.5">
          {order.deadline && (
            <span className={`text-[11px] px-1.5 py-0.5 rounded ${deadlineCls}`}>
              {formatDate(order.deadline)}
            </span>
          )}
          {order.tht && (
            <span className="text-[11px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
              THT {formatDate(order.tht)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
