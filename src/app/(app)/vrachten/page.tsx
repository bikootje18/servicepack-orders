import Link from 'next/link'
import { getVrachten, countVrachtenArchief } from '@/lib/db/vrachten'
import { markeerVrachtOpgehaald } from '@/lib/actions/vrachten'
import { formatDate } from '@/lib/utils/formatters'

export default async function VrachtenPage() {
  const [vrachten, archiefAantal] = await Promise.all([
    getVrachten(),
    countVrachtenArchief(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vrachten</h1>
        <Link href="/vrachten/nieuw" className="btn-primary">
          + Nieuwe vracht
        </Link>
      </div>

      {vrachten.length === 0 ? (
        <p className="text-gray-500 text-sm">Geen vrachten wachtend op ophalen.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Vrachtbrief nr.</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Klant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Datum</th>
                <th className="px-4 py-3"></th>
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
                  <td className="px-4 py-3 text-right">
                    <form action={markeerVrachtOpgehaald.bind(null, v.id)}>
                      <button
                        type="submit"
                        className="text-xs font-medium text-green-700 border border-green-300 px-3 py-1 rounded hover:bg-green-50 transition-colors"
                      >
                        Markeer als opgehaald
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {archiefAantal > 0 && (
        <div className="mt-6">
          <Link
            href="/vrachten/archief"
            className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Archief opgehaalde vrachten</span>
              <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums">
                {archiefAantal}
              </span>
            </div>
            <span className="text-gray-400 group-hover:text-gray-600 transition-colors text-sm">→</span>
          </Link>
        </div>
      )}
    </div>
  )
}
