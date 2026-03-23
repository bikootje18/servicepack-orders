import { getVoorraad, groepeerdOpKlant } from '@/lib/db/voorraad'
import { formatAantal } from '@/lib/utils/formatters'
import { VoorraadExportKnop } from '@/components/voorraad/VoorraadExportKnop'

export default async function VoorraadPage() {
  const regels = await getVoorraad()
  const groepen = groepeerdOpKlant(regels)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Voorraad</h1>

      {Object.keys(groepen).length === 0 && (
        <p className="text-gray-500 text-sm">Geen actieve voorraad.</p>
      )}

      {Object.entries(groepen).map(([klantNaam, klantRegels]) => (
        <div key={klantNaam} className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">{klantNaam}</h2>
            <VoorraadExportKnop klantNaam={klantNaam} regels={klantRegels} />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Order</th>
                <th className="text-right py-2 font-medium text-gray-600">Totaal</th>
                <th className="text-right py-2 font-medium text-gray-600">Geleverd</th>
                <th className="text-right py-2 font-medium text-gray-600">Resterend</th>
              </tr>
            </thead>
            <tbody>
              {klantRegels.map(r => (
                <tr key={r.order_id} className="border-b border-gray-100">
                  <td className="py-2 font-mono text-xs">{r.order_nummer}</td>
                  <td className="py-2 text-right">{formatAantal(r.order_grootte)}</td>
                  <td className="py-2 text-right">{formatAantal(r.totaal_geleverd)}</td>
                  <td className="py-2 text-right font-semibold">{formatAantal(r.resterend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
