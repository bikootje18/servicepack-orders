import Link from 'next/link'
import { getVrachten } from '@/lib/db/vrachten'
import { markeerVrachtOpgehaald } from '@/lib/actions/vrachten'
import { formatDate } from '@/lib/utils/formatters'

export default async function VrachtenPage() {
  const vrachten = await getVrachten()

  const wachtend = vrachten.filter(v => v.status === 'aangemaakt')
  const opgehaald = vrachten.filter(v => v.status === 'opgehaald')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vrachten</h1>
        <Link href="/vrachten/nieuw" className="btn-primary">
          + Nieuwe vracht
        </Link>
      </div>

      {vrachten.length === 0 ? (
        <p className="text-gray-500 text-sm">Nog geen vrachten aangemaakt.</p>
      ) : (
        <div className="space-y-12">

          {/* Wacht op ophalen */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Wacht op ophalen ({wachtend.length})
            </h2>
            {wachtend.length === 0 ? (
              <p className="text-sm text-gray-400">Geen vrachten wachtend.</p>
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
                    {wachtend.map(v => (
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
          </div>

          {/* Opgehaald */}
          {opgehaald.length > 0 && (
            <div className="pt-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Opgehaald ({opgehaald.length})
              </h2>
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
                    {opgehaald.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50/70 transition-colors opacity-60">
                        <td className="px-4 py-3">
                          <Link href={`/vrachten/${v.id}`} className="font-mono text-xs text-blue-600 hover:text-blue-800 font-medium">
                            {v.vrachtbrief_nummer}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-medium">{v.klant?.naam}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(v.datum)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-green-600 font-medium">✓ Opgehaald</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
