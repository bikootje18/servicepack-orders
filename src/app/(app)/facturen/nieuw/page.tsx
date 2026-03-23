import { redirect } from 'next/navigation'
import { getOrder } from '@/lib/db/orders'
import { getOngefactureerdeLeveringen, createFactuur } from '@/lib/db/facturen'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency, formatAantal } from '@/lib/utils/formatters'

export default async function NieuweFactuurPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id: string }>
}) {
  const { order_id } = await searchParams
  const order = await getOrder(order_id)
  const leveringen = await getOngefactureerdeLeveringen(order_id)

  async function maakFactuurAan(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const leveringIds = formData.getAll('levering_ids') as string[]
    if (leveringIds.length === 0) return

    const factuur = await createFactuur({
      order_id,
      levering_ids: leveringIds,
      tarief: order.facturatie_code!.tarief,
      aangemaakt_door: user?.id ?? null,
    })
    redirect(`/facturen/${factuur.id}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Factuur aanmaken</h1>
      <p className="text-gray-500 text-sm mb-6">Order {order.order_nummer} · {order.klant?.naam}</p>

      <form action={maakFactuurAan}>
        <h2 className="font-semibold mb-3">Selecteer leveringen</h2>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-8"></th>
              <th className="text-left py-2 font-medium text-gray-600">Datum</th>
              <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
              <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {leveringen.map(l => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2">
                  <input type="checkbox" name="levering_ids" value={l.id} defaultChecked />
                </td>
                <td className="py-2">{formatDate(l.leverdatum)}</td>
                <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
                <td className="py-2 text-right">{formatCurrency(order.facturatie_code!.tarief * l.aantal_geleverd)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-sm text-gray-500 mb-4">Tarief: {formatCurrency(order.facturatie_code!.tarief)} per eenheid (excl. BTW)</p>

        <button type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700">
          Factuur aanmaken
        </button>
      </form>
    </div>
  )
}
