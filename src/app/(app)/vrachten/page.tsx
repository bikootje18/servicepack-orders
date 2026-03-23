import Link from 'next/link'
import { getVrachten } from '@/lib/db/vrachten'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'

export default async function VrachtenPage() {
  const vrachten = await getVrachten()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vrachten</h1>
        <Link href="/vrachten/nieuw"
          className="btn-primary">
          + Nieuwe vracht
        </Link>
      </div>

      {vrachten.length === 0 ? (
        <p className="text-gray-500 text-sm">Nog geen vrachten aangemaakt.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">Vrachtbrief nr.</th>
              <th className="text-left py-2 font-medium text-gray-600">Klant</th>
              <th className="text-left py-2 font-medium text-gray-600">Datum</th>
              <th className="text-left py-2 font-medium text-gray-600">Factuur</th>
              <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {vrachten.map(v => (
              <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2">
                  <Link href={`/vrachten/${v.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                    {v.vrachtbrief_nummer}
                  </Link>
                </td>
                <td className="py-2">{v.klant?.naam}</td>
                <td className="py-2">{formatDate(v.datum)}</td>
                <td className="py-2">
                  {v.factuur ? (
                    <Link href={`/facturen/${v.factuur.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                      {v.factuur.factuur_nummer}
                    </Link>
                  ) : (
                    <span className="text-gray-400">–</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {v.factuur ? formatCurrency(v.factuur.totaal_bedrag) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
