import { getOrdersPerLocatie, getVrachtenPerLocatie } from '@/lib/db/dashboard'
import { LOCATIES } from '@/lib/constants/locaties'
import { LocatieKolom } from '@/components/dashboard/LocatieKolom'

export default async function DashboardPage() {
  const [orders, vrachten] = await Promise.all([
    getOrdersPerLocatie(),
    getVrachtenPerLocatie(),
  ])

  const nu = new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="-m-8 min-h-screen bg-slate-100 p-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400 mb-1">Productie</p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Locatie-overzicht</h1>
        </div>
        <p className="text-sm text-slate-400 capitalize">{nu}</p>
      </div>

      <div className="grid grid-cols-3 gap-6 items-start">
        {LOCATIES.map((l, i) => (
          <LocatieKolom
            key={l.waarde}
            locatie={l.waarde}
            label={l.label}
            index={i}
            inBehandeling={orders[l.waarde].inBehandeling}
            bevestigd={orders[l.waarde].bevestigd}
            vrachten={vrachten[l.waarde]}
          />
        ))}
      </div>
    </div>
  )
}
