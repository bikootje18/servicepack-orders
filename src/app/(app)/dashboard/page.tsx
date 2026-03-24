import { getOrdersPerLocatie, getVrachtenPerLocatie } from '@/lib/db/dashboard'
import { LOCATIES } from '@/lib/constants/locaties'
import { LocatieKolom } from '@/components/dashboard/LocatieKolom'

export default async function DashboardPage() {
  const [orders, vrachten] = await Promise.all([
    getOrdersPerLocatie(),
    getVrachtenPerLocatie(),
  ])

  return (
    <div>
      {/* Title area */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Productie overzicht</h1>
        <p className="text-sm text-gray-500 mt-0.5">Actieve orders en uitgaande vrachten per locatie</p>
      </div>

      {/* Three-column grid */}
      <div className="grid grid-cols-3 gap-5 items-start">
        {LOCATIES.map(l => (
          <LocatieKolom
            key={l.waarde}
            locatie={l.waarde}
            label={l.label}
            inBehandeling={orders[l.waarde].inBehandeling}
            bevestigd={orders[l.waarde].bevestigd}
            vrachten={vrachten[l.waarde]}
          />
        ))}
      </div>
    </div>
  )
}
