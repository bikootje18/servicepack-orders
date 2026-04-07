import type { Levering } from '@/types'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

export function LeveringenList({ leveringen }: { leveringen: Levering[] }) {
  if (leveringen.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl">
        Nog geen gereedmeldingen geregistreerd.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">#</th>
            <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">Datum</th>
            <th className="text-right px-5 py-3 font-semibold text-xs text-gray-500">Aantal</th>
            <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">THT</th>
            <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">Notities</th>
            <th className="text-center px-5 py-3 font-semibold text-xs text-gray-500">Factuur</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {leveringen.map((l, i) => (
            <tr key={l.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3.5 text-xs text-gray-400 tabular-nums font-medium">
                {leveringen.length - i}
              </td>
              <td className="px-5 py-3.5 font-medium text-gray-900 tabular-nums">
                {formatDate(l.leverdatum)}
              </td>
              <td className="px-5 py-3.5 text-right font-bold tabular-nums text-gray-900">
                {formatAantal(l.aantal_geleverd)}
              </td>
              <td className="px-5 py-3.5 text-gray-500 text-xs tabular-nums">
                {l.tht ? formatDate(l.tht) : <span className="text-gray-300">–</span>}
              </td>
              <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate">
                {l.notities || <span className="text-gray-300">–</span>}
              </td>
              <td className="px-5 py-3.5 text-center">
                {l.factuur_id ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">✓</span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">–</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
