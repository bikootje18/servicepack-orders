import Link from 'next/link'
import { getVracht } from '@/lib/db/vrachten'
import { getLeveringenVoorVrachtFactuur } from '@/lib/db/facturen'
import { KlaarDownloadKnoppen } from '@/components/vrachten/KlaarDownloadKnoppen'
import { formatDate } from '@/lib/utils/formatters'
import type { Factuur } from '@/types'

export default async function VrachtKlaarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const vracht = await getVracht(id)
  const factuur = vracht.factuur as unknown as Factuur

  const leveringen = factuur
    ? await getLeveringenVoorVrachtFactuur(factuur.id)
    : []

  const klantNaam = vracht.klant?.naam ?? '–'

  return (
    <div className="max-w-xl mx-auto pt-8">
      {/* Success header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Vracht aangemaakt</h1>
      </div>

      <p className="text-gray-500 text-sm mb-8 pl-11">
        {klantNaam} · {formatDate(vracht.datum)}
        {vracht.notities && <> · <span className="italic">{vracht.notities}</span></>}
      </p>

      {factuur ? (
        <KlaarDownloadKnoppen
          vracht={vracht as any}
          factuur={factuur}
          leveringen={leveringen as any}
          klantNaam={klantNaam}
        />
      ) : (
        <p className="text-sm text-red-600">Factuur kon niet worden aangemaakt.</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <Link
          href="/vrachten/nieuw"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          + Nieuwe vracht
        </Link>
        <Link
          href={`/vrachten/${id}`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Vracht details →
        </Link>
      </div>
    </div>
  )
}
