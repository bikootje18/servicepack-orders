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

  const totaalActief = orders.inBehandeling.length
  const totaalAankomend = orders.bevestigd.length

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
          Productie
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl font-black text-gray-900 leading-none">{label}</h1>
          <p className="text-sm text-gray-400 capitalize pb-0.5 flex-shrink-0">{nu}</p>
        </div>
        {/* Samenvatting */}
        {(totaalActief > 0 || totaalAankomend > 0) && (
          <div className="flex items-center gap-4 mt-3">
            {totaalActief > 0 && (
              <span className="text-xs font-semibold text-violet-600">
                {totaalActief} actief
              </span>
            )}
            {totaalAankomend > 0 && (
              <span className="text-xs font-semibold text-gray-400">
                {totaalAankomend} aankomend
              </span>
            )}
          </div>
        )}
        <div className="mt-4 h-px bg-gray-200" />
      </div>

      <LocatieSecties orders={orders} locatie={locatie} />
    </div>
  )
}
