import type { Order } from '@/types'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate, formatAantal } from '@/lib/utils/formatters'
import { meldOrderGereed } from '@/lib/actions/locatie'

interface Props {
  order: Order
  locatie: string
}

const STATUS_LABEL: Record<string, string> = {
  in_behandeling: 'In behandeling',
  bevestigd: 'Aankomend',
}

export function LocatieOrderKaartje({ order, locatie }: Props) {
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
      : { backgroundColor: '#f3f4f6', color: '#6b7280' }

  const statusKleur =
    order.status === 'in_behandeling' ? '#d97706' : '#2563eb'

  const kanGereedMelden = order.status === 'in_behandeling'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex">
        <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: accentKleur }} />
        <div className="flex-1 p-5">

          {/* Ordernummer + grootte */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="font-mono text-base font-bold text-gray-900">
              {order.order_nummer}
            </span>
            <span className="text-sm text-gray-400 tabular-nums flex-shrink-0">
              {formatAantal(order.order_grootte)} st.
            </span>
          </div>

          {/* Omschrijving */}
          {order.omschrijving && (
            <p className="text-sm text-gray-700 mb-1">{order.omschrijving}</p>
          )}

          {/* Bewerking */}
          {order.bewerking && (
            <p className="text-xs text-gray-400 mb-3">{order.bewerking}</p>
          )}

          {/* Status + deadline + THT */}
          <div className="flex items-center justify-between gap-2 mt-3">
            <span className="text-xs font-semibold" style={{ color: statusKleur }}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <div className="flex items-center gap-1.5">
              {order.deadline && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={deadlineStijl}>
                  {formatDate(order.deadline)}
                </span>
              )}
              {order.tht && (
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  THT {formatDate(order.tht)}
                </span>
              )}
            </div>
          </div>

          {/* Gereed melden */}
          {kanGereedMelden && (
            <form
              action={async () => {
                'use server'
                await meldOrderGereed(order.id, locatie)
              }}
              className="mt-4"
            >
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
              >
                Gereed melden
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
