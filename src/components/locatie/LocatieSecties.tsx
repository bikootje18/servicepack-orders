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
      <div className="text-center py-32">
        <p className="text-3xl text-gray-300 mb-3">—</p>
        <p className="text-gray-400 text-sm">Geen actieve orders voor deze locatie</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {inBehandeling.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">
              In behandeling
            </span>
            <span className="flex-1 h-px bg-violet-500/20" />
            <span className="text-[10px] font-bold text-violet-500/60">{inBehandeling.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inBehandeling.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </section>
      )}

      {bevestigd.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Aankomend
            </span>
            <span className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400">{bevestigd.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {bevestigd.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
