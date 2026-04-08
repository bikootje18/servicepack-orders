import { getOrdersPerLocatie, getVrachtenPerLocatie } from '@/lib/db/dashboard'
import { DASHBOARD_LOCATIES } from '@/lib/constants/locaties'
import { LocatieKolom } from '@/components/dashboard/LocatieKolom'

const KLEUREN = ['#2563eb', '#059669', '#7c3aed'] as const

export default async function DashboardPage() {
  const [orders, vrachten] = await Promise.all([
    getOrdersPerLocatie(),
    getVrachtenPerLocatie(),
  ])

  const nu = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Productie</p>
          <h1 className="text-2xl font-bold text-gray-900">Locatie-overzicht</h1>
        </div>
        <p className="text-sm text-gray-400 capitalize pb-0.5">{nu}</p>
      </div>

      <div className="grid grid-cols-3 gap-5 items-start">
        {DASHBOARD_LOCATIES.map((l, i) => (
          <LocatieKolom
            key={l.waarde}
            label={l.label}
            kleur={KLEUREN[i]}
            inBehandeling={orders[l.waarde].inBehandeling}
            bevestigd={orders[l.waarde].bevestigd}
            vrachten={vrachten[l.waarde]}
          />
        ))}
      </div>
    </div>
  )
}
