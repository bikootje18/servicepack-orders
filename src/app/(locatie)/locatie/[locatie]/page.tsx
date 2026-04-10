import { notFound } from 'next/navigation'
import { isGeldigeLocatie, getOrdersVoorLocatie } from '@/lib/db/locatie'
import { locatieLabel } from '@/lib/constants/locaties'
import { LocatieSecties } from '@/components/locatie/LocatieSecties'

export default async function LocatiePage({
  params,
}: {
  params: Promise<{ locatie: string }>
}) {
  const { locatie } = await params
  if (!isGeldigeLocatie(locatie)) notFound()

  const orders = await getOrdersVoorLocatie(locatie)
  const label = locatieLabel(locatie)

  const nu = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Productie
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
        </div>
        <p className="text-sm text-gray-400 capitalize pb-0.5">{nu}</p>
      </div>

      <LocatieSecties orders={orders} locatie={locatie} />
    </div>
  )
}
