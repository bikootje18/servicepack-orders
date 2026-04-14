import Link from 'next/link'
import { getVrachtenArchief } from '@/lib/db/vrachten'
import { markeerVrachtNietOpgehaald } from '@/lib/actions/vrachten'
import { formatDate } from '@/lib/utils/formatters'

export default async function VrachtenArchiefPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; q?: string }>
}) {
  const { p, q } = await searchParams
  const pagina = parseInt(p ?? '1') || 1
  const zoek = q ?? ''

  const { vrachten, totaal, paginas } = await getVrachtenArchief({ pagina, zoek })

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/vrachten" className="text-gray-400 hover:text-gray-700 text-sm">
          ← Vrachten
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-2xl font-bold">Archief</h1>
        <span className="text-sm text-gray-400 font-normal">{totaal.toLocaleString('nl-NL')} vrachten</span>
      </div>

      {/* Zoekbalk */}
      <form method="GET" className="mb-4">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={zoek}
            placeholder="Zoek op klantnaam…"
            className="form-input max-w-xs"
          />
          {zoek && (
            <Link
              href="/vrachten/archief"
              className="text-sm text-gray-400 hover:text-gray-700 self-center px-2"
            >
              Wissen
            </Link>
          )}
        </div>
      </form>

      {vrachten.length === 0 ? (
        <p className="text-gray-500 text-sm py-8">
          {zoek ? `Geen vrachten gevonden voor "${zoek}".` : 'Geen gearchiveerde vrachten.'}
        </p>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Vrachtbrief nr.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Klant</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Datum</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Status</th>
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
                    <td className="px-4 py-3 font-medium text-gray-600">{v.klant?.naam}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(v.datum)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-emerald-600 font-medium">✓ Opgehaald</span>
                        <form action={markeerVrachtNietOpgehaald.bind(null, v.id)}>
                          <button
                            type="submit"
                            className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-50 transition-colors"
                          >
                            Ongedaan maken
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginering */}
          {paginas > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400 text-xs">
                Pagina {pagina} van {paginas}
              </span>
              <div className="flex gap-2">
                {pagina > 1 && (
                  <Link
                    href={`/vrachten/archief?p=${pagina - 1}${zoek ? `&q=${encodeURIComponent(zoek)}` : ''}`}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                  >
                    ← Vorige
                  </Link>
                )}
                {pagina < paginas && (
                  <Link
                    href={`/vrachten/archief?p=${pagina + 1}${zoek ? `&q=${encodeURIComponent(zoek)}` : ''}`}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                  >
                    Volgende →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
