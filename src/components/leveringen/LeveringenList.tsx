import type { Levering } from '@/types'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

export function LeveringenList({ leveringen }: { leveringen: Levering[] }) {
  if (leveringen.length === 0) {
    return <p className="text-sm text-gray-500">Nog geen leveringen geregistreerd.</p>
  }
  return (
    <table className="w-full text-sm mb-6">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-2 font-medium text-gray-600">Datum</th>
          <th className="text-right py-2 font-medium text-gray-600">Aantal</th>
          <th className="text-left py-2 font-medium text-gray-600">THT</th>
          <th className="text-left py-2 font-medium text-gray-600">Notities</th>
          <th className="text-center py-2 font-medium text-gray-600">Gefactureerd</th>
        </tr>
      </thead>
      <tbody>
        {leveringen.map(l => (
          <tr key={l.id} className="border-b border-gray-100">
            <td className="py-2">{formatDate(l.leverdatum)}</td>
            <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
            <td className="py-2 text-gray-500">{l.tht ? formatDate(l.tht) : '–'}</td>
            <td className="py-2 text-gray-500">{l.notities || '–'}</td>
            <td className="py-2 text-center">{l.factuur_id ? '✓' : '✗'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
