import Link from 'next/link'
import { getFacturen } from '@/lib/db/facturen'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'

const statusLabel: Record<string, string> = {
  concept: 'Concept',
  verzonden: 'Verzonden',
  betaald: 'Betaald',
}

export default async function FacturenPage() {
  const facturen = await getFacturen()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Facturen</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Factuurnummer</th>
            <th className="text-left py-2 font-medium text-gray-600">Klant</th>
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-right py-2 pr-4 font-medium text-gray-600">Bedrag</th>
            <th className="text-left py-2 font-medium text-gray-600">Status</th>
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
          </tr>
        </thead>
        <tbody>
          {facturen.map(f => (
            <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/facturen/${f.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {f.factuur_nummer}
                </Link>
              </td>
              <td className="py-2">{(f.order as any)?.klant?.naam ?? (f.vracht as any)?.klant?.naam ?? '–'}</td>
              <td className="py-2 font-mono text-xs text-gray-500">{(f.order as any)?.order_nummer ?? (f.vracht as any)?.vrachtbrief_nummer ?? '–'}</td>
              <td className="py-2 text-right pr-4">{formatCurrency(f.totaal_bedrag)}</td>
              <td className="py-2">{statusLabel[f.status]}</td>
              <td className="py-2 text-gray-500">{formatDate(f.factuurdatum)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
