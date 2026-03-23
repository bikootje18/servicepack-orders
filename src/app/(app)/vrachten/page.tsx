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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Vrachtbrief nr.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Klant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Factuur</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Bedrag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vrachten.map(v => (
                <tr key={v.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/vrachten/${v.id}`} className="font-mono text-xs text-blue-600 hover:text-blue-800 font-medium">
                      {v.vrachtbrief_nummer}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{v.klant?.naam}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(v.datum)}</td>
                  <td className="px-4 py-3">
                    {v.factuur ? (
                      <Link href={`/facturen/${v.factuur.id}`} className="font-mono text-xs text-blue-600 hover:text-blue-800">
                        {v.factuur.factuur_nummer}
                      </Link>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {v.factuur ? formatCurrency(v.factuur.totaal_bedrag) : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
