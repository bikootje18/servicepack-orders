import type { LocatieOrders } from '@/lib/db/locatie'
import { LocatieOrderKaartje } from './LocatieOrderKaartje'

interface Props {
  orders: LocatieOrders
  locatie: string
}

export function LocatieSecties({ orders, locatie }: Props) {
  const { inBehandeling, bevestigd } = orders
  const leeg = inBehandeling.length === 0 && bevestigd.length === 0

  if (leeg) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-400 text-sm">Geen actieve orders voor deze locatie</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {inBehandeling.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-4">
            In behandeling — {inBehandeling.length}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inBehandeling.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </section>
      )}

      {bevestigd.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Aankomend — {bevestigd.length}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bevestigd.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
