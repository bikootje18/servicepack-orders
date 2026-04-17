import { getOrdersPerLocatie, getVrachtenPerLocatie, getOrdersOverigeLocaties } from '@/lib/db/dashboard'
import { getKlanten } from '@/lib/db/klanten'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string }>
}) {
  const { klant: klantId } = await searchParams

  const [orders, vrachten, overigeOrders, klanten] = await Promise.all([
    getOrdersPerLocatie(klantId),
    getVrachtenPerLocatie(),
    getOrdersOverigeLocaties(klantId),
    getKlanten(),
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

      <DashboardGrid
        orders={orders}
        vrachten={vrachten}
        overigeOrders={overigeOrders}
        klanten={klanten.map(k => ({ id: k.id, naam: k.naam }))}
        geselecteerdeKlantId={klantId}
      />
    </div>
  )
}
