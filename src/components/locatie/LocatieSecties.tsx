import type { LocatieOrders } from '@/lib/db/locatie'
import { LocatieOrderKaartje } from './LocatieOrderKaartje'

interface Props {
  orders: LocatieOrders
  locatie: string
}

function SectieHeader({ label, aantal, kleur }: { label: string; aantal: number; kleur: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-4 w-1 rounded-full" style={{ backgroundColor: kleur }} />
      <h2 className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: kleur }}>
        {label}
      </h2>
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white"
        style={{ backgroundColor: kleur }}
      >
        {aantal}
      </span>
    </div>
  )
}

export function LocatieSecties({ orders, locatie }: Props) {
  const { inBehandeling, bevestigd } = orders
  const leeg = inBehandeling.length === 0 && bevestigd.length === 0

  if (leeg) {
    return (
      <div className="text-center py-32">
        <p className="text-2xl mb-2">—</p>
        <p className="text-gray-400 text-sm">Geen actieve orders voor deze locatie</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {inBehandeling.length > 0 && (
        <section>
          <SectieHeader label="In behandeling" aantal={inBehandeling.length} kleur="#7c3aed" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inBehandeling.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </section>
      )}

      {bevestigd.length > 0 && (
        <section>
          <SectieHeader label="Aankomend" aantal={bevestigd.length} kleur="#94a3b8" />
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
