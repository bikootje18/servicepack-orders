import Link from 'next/link'
import { getVracht } from '@/lib/db/vrachten'
import { createVrachtFactuurAction } from '@/lib/actions/vrachten'
import { VrachtbriefKnop } from '@/components/vrachten/VrachtbriefKnop'
import { formatDate, formatAantal, formatCurrency } from '@/lib/utils/formatters'

export default async function VrachtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const vracht = await getVracht(id)
  const regels = vracht.regels ?? []

  const totaalEenheden = regels.reduce(
    (sum, r) => sum + (r.levering?.aantal_geleverd ?? 0), 0
  )

  const totaalBedrag = regels.reduce((sum, r) => {
    const tarief = r.levering?.order?.facturatie_code?.tarief ?? 0
    return sum + tarief * (r.levering?.aantal_geleverd ?? 0)
  }, 0)

  async function factuurAanmaken() {
    'use server'
    await createVrachtFactuurAction(id)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono mb-1">{vracht.vrachtbrief_nummer}</h1>
          <p className="text-gray-500 text-sm">
            {vracht.klant?.naam} · {formatDate(vracht.datum)}
          </p>
        </div>
        <div className="flex gap-2">
          <VrachtbriefKnop vracht={vracht} />
        </div>
      </div>

      {vracht.notities && (
        <p className="text-sm text-gray-600 mb-4 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          {vracht.notities}
        </p>
      )}

      <h2 className="font-semibold mb-3">Leveringen in deze vracht</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
            <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
            <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {regels.map(r => {
            const levering = r.levering!
            const tarief = levering.order?.facturatie_code?.tarief ?? 0
            return (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-2">
                  <Link
                    href={`/orders/${levering.order_id}`}
                    className="font-mono text-xs text-blue-600 hover:underline"
                  >
                    {levering.order?.order_nummer}
                  </Link>
                </td>
                <td className="py-2">{formatDate(levering.leverdatum)}</td>
                <td className="py-2 text-right">{formatAantal(levering.aantal_geleverd)}</td>
                <td className="py-2 text-right">{formatCurrency(tarief * levering.aantal_geleverd)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300">
            <td className="py-2 font-semibold" colSpan={2}>Totaal</td>
            <td className="py-2 text-right font-semibold">{formatAantal(totaalEenheden)}</td>
            <td className="py-2 text-right font-semibold">{formatCurrency(totaalBedrag)}</td>
          </tr>
        </tfoot>
      </table>

      {vracht.factuur ? (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
          <p className="font-medium text-green-800 mb-1">Factuur aangemaakt</p>
          <Link
            href={`/facturen/${vracht.factuur.id}`}
            className="text-blue-600 hover:underline font-mono text-xs"
          >
            {vracht.factuur.factuur_nummer}
          </Link>
          {' · '}
          {formatCurrency(vracht.factuur.totaal_bedrag)}
        </div>
      ) : (
        <form action={factuurAanmaken}>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
          >
            Factuur aanmaken
          </button>
        </form>
      )}
    </div>
  )
}
