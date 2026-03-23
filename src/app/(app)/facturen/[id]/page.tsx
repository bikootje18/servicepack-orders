import { getFactuur, updateFactuurStatus } from '@/lib/db/facturen'
import { getLeveringen } from '@/lib/db/leveringen'
import { FactuurPrintKnop } from '@/components/facturen/FactuurPrintKnop'
import { revalidatePath } from 'next/cache'
import { formatDate, formatCurrency, formatAantal } from '@/lib/utils/formatters'

const statusLabel: Record<string, string> = {
  concept: 'Concept',
  verzonden: 'Verzonden',
  betaald: 'Betaald',
}

export default async function FactuurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const factuur = await getFactuur(id)
  // Guard: vracht facturen have null order_id — Task 8 fully handles them
  const leveringen = factuur.order_id
    ? await getLeveringen(factuur.order_id).then(all => all.filter(l => l.factuur_id === id))
    : []
  const klantNaam = (factuur.order as any)?.klant?.naam
    ?? (factuur.vracht as any)?.klant?.naam
    ?? '–'

  async function setVerzonden() {
    'use server'
    await updateFactuurStatus(id, 'verzonden')
    revalidatePath(`/facturen/${id}`)
  }

  async function setBetaald() {
    'use server'
    await updateFactuurStatus(id, 'betaald')
    revalidatePath(`/facturen/${id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono mb-1">{factuur.factuur_nummer}</h1>
          <p className="text-gray-500 text-sm">{klantNaam} · {statusLabel[factuur.status]}</p>
        </div>
        <FactuurPrintKnop factuur={factuur} leveringen={leveringen} klantNaam={klantNaam} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Factuurdatum:</span> <strong>{formatDate(factuur.factuurdatum)}</strong></div>
        <div><span className="text-gray-500">Order:</span> <strong className="font-mono text-xs">{(factuur.order as any)?.order_nummer}</strong></div>
        <div><span className="text-gray-500">Totaal eenheden:</span> <strong>{formatAantal(factuur.totaal_eenheden)}</strong></div>
        <div><span className="text-gray-500">Tarief:</span> <strong>{formatCurrency(factuur.tarief)} / eenheid</strong></div>
        <div className="col-span-2 pt-2 border-t border-gray-100">
          <span className="text-gray-500">Totaalbedrag excl. BTW:</span>{' '}
          <strong className="text-lg">{formatCurrency(factuur.totaal_bedrag)}</strong>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Leveringen in deze factuur</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
            <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
            <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {leveringen.map(l => (
            <tr key={l.id} className="border-b border-gray-100">
              <td className="py-2">{formatDate(l.leverdatum)}</td>
              <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
              <td className="py-2 text-right">{formatCurrency(factuur.tarief * l.aantal_geleverd)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-3">
        {factuur.status === 'concept' && (
          <form action={setVerzonden}>
            <button type="submit"
              className="border border-blue-300 text-blue-700 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50">
              Markeer als verzonden
            </button>
          </form>
        )}
        {factuur.status === 'verzonden' && (
          <form action={setBetaald}>
            <button type="submit"
              className="border border-green-300 text-green-700 px-4 py-2 rounded text-sm font-medium hover:bg-green-50">
              Markeer als betaald
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
