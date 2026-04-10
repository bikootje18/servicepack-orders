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
      <div className="py-20 text-center">
        <p className="text-sm text-gray-400">Geen actieve orders voor deze locatie</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {inBehandeling.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: '#7c3aed' }}>
            In behandeling
          </p>
          <div className="flex flex-col gap-2.5">
            {inBehandeling.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </div>
      )}

      {bevestigd.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
            Aankomend
          </p>
          <div className="flex flex-col gap-2.5">
            {bevestigd.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
