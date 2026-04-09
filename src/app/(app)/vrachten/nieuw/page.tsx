import Link from 'next/link'
import { getKlanten, getKlant } from '@/lib/db/klanten'
import { KlantKiezer } from '@/components/vrachten/KlantKiezer'
import { getOngefactureerdeLeveringenVoorKlant } from '@/lib/db/vrachten'
import { createVrachtAction } from '@/lib/actions/vrachten'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

export default async function NieuweVrachtPage({
  searchParams,
}: {
  searchParams: Promise<{ klant_id?: string }>
}) {
  const { klant_id } = await searchParams

  // Stap 1: geen klant gekozen
  if (!klant_id) {
    const klanten = await getKlanten()
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-6">Nieuwe vracht – kies klant</h1>
        <KlantKiezer klanten={klanten} />
      </div>
    )
  }

  // Stap 2: klant bekend
  const [leveringen, klant] = await Promise.all([
    getOngefactureerdeLeveringenVoorKlant(klant_id),
    getKlant(klant_id),
  ])

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
          {klant.naam} ·{' '}
          <Link href="/vrachten/nieuw" className="text-blue-600 hover:underline">andere klant</Link>
        </p>
      </div>

      <form action={createVrachtAction}>
        <input type="hidden" name="klant_id" value={klant_id} />

        {/* Datum + notities */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input type="date" name="datum" defaultValue={today} required className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
            <input type="text" name="notities" placeholder="Optioneel" className="form-input" />
          </div>
        </div>

        {/* Afleveradres — default is klantadres, aanpasbaar */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Afleveradres <span className="font-normal normal-case text-gray-400">(default: klantadres)</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Naam</label>
              <input
                type="text"
                name="aflever_naam"
                defaultValue={klant.naam}
                className="form-input"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Adres</label>
              <input
                type="text"
                name="aflever_adres"
                defaultValue={klant.adres ?? ''}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Postcode</label>
              <input
                type="text"
                name="aflever_postcode"
                defaultValue={klant.postcode ?? ''}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stad</label>
              <input
                type="text"
                name="aflever_stad"
                defaultValue={klant.stad ?? ''}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Land</label>
              <input
                type="text"
                name="aflever_land"
                defaultValue={klant.land ?? ''}
                className="form-input"
              />
            </div>
          </div>
        </div>

        {/* Leveringen selecteren */}
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
          Leveringen
        </h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-xs text-gray-500">Leverdatum</th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-gray-500">Beschikbaar</th>
                <th className="text-right px-4 py-3 font-semibold text-xs text-gray-500">In deze vracht</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leveringen.map(l => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <input type="checkbox" name="levering_ids" value={l.id} defaultChecked className="form-checkbox" />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">
                    {(l as any).order?.order_nummer}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(l.leverdatum)}</td>
                  <td className="px-4 py-3 pr-8 text-right tabular-nums text-gray-500">
                    {formatAantal(l.aantal_geleverd)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      name={`aantal_${l.id}`}
                      defaultValue={l.aantal_geleverd}
                      min={1}
                      max={l.aantal_geleverd}
                      className="form-input w-28 text-right tabular-nums text-base font-semibold"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <button type="submit" className="btn-primary px-6">
            Vracht aanmaken
          </button>
        </div>
      </form>
    </div>
  )
}
