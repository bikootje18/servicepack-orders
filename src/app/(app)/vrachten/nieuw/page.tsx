import Link from 'next/link'
import { getKlanten } from '@/lib/db/klanten'
import { getOngefactureerdeLeveringenVoorKlant } from '@/lib/db/vrachten'
import { createVrachtAction } from '@/lib/actions/vrachten'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

export default async function NieuweVrachtPage({
  searchParams,
}: {
  searchParams: Promise<{ klant_id?: string }>
}) {
  const { klant_id } = await searchParams

  // Step 1: no klant_id → show klant picker
  if (!klant_id) {
    const klanten = await getKlanten()
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-6">Nieuwe vracht – kies klant</h1>
        <div className="space-y-2">
          {klanten.map(k => (
            <Link
              key={k.id}
              href={`/vrachten/nieuw?klant_id=${k.id}`}
              className="block border border-gray-200 rounded px-4 py-3 hover:bg-gray-50 text-sm font-medium"
            >
              {k.naam}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: klant_id known → show available leveringen
  const leveringen = await getOngefactureerdeLeveringenVoorKlant(klant_id)
  const klantNaam = (leveringen[0] as any)?.order?.klant?.naam ?? klant_id

  if (leveringen.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-2">Nieuwe vracht</h1>
        <p className="text-gray-500 text-sm mb-4">
          Geen beschikbare leveringen voor deze klant. Voeg eerst leveringen toe aan orders.
        </p>
        <Link href="/vrachten/nieuw" className="text-sm text-blue-600 hover:underline">
          ← Andere klant kiezen
        </Link>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Nieuwe vracht</h1>
        <p className="text-gray-500 text-sm">
          {klantNaam} ·{' '}
          <Link href="/vrachten/nieuw" className="text-blue-600 hover:underline">andere klant</Link>
        </p>
      </div>

      <form action={createVrachtAction}>
        <input type="hidden" name="klant_id" value={klant_id} />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              type="date"
              name="datum"
              defaultValue={today}
              required
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
            <input
              type="text"
              name="notities"
              placeholder="Optioneel"
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        <h2 className="font-semibold mb-3">Selecteer leveringen</h2>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-8"></th>
              <th className="text-left py-2 font-medium text-gray-600">Order</th>
              <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
              <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
            </tr>
          </thead>
          <tbody>
            {leveringen.map(l => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2">
                  <input type="checkbox" name="levering_ids" value={l.id} defaultChecked />
                </td>
                <td className="py-2 font-mono text-xs">{(l as any).order?.order_nummer}</td>
                <td className="py-2">{formatDate(l.leverdatum)}</td>
                <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          Vracht aanmaken
        </button>
      </form>
    </div>
  )
}
