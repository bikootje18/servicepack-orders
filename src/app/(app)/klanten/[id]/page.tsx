import { getKlant, updateKlant } from '@/lib/db/klanten'
import { getGiveXImports } from '@/lib/db/give-x-imports'
import { getOrdersVoorKlant } from '@/lib/db/orders'
import { groepeerOrders } from '@/lib/utils/order-groepering'
import { ImportDropzone } from '@/components/give-x/ImportDropzone'
import { KlantBewerkFormulier } from '@/components/klanten/KlantBewerkFormulier'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { OrderMetVrachten } from '@/lib/utils/order-groepering'

const GIVE_X_NAAM_VARIANTEN = ['give-x', 'givex']

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klant = await getKlant(id).catch(() => null)
  if (!klant) notFound()

  const isGiveX = GIVE_X_NAAM_VARIANTEN.some(v => klant.naam.toLowerCase().includes(v))

  const [alleOrders, imports] = await Promise.all([
    getOrdersVoorKlant(id),
    isGiveX ? getGiveXImports(id) : Promise.resolve([]),
  ])

  const groepen = groepeerOrders(alleOrders)
  const ongematchteImports = imports.filter(i => !i.order_id)
  const gematchteImports = imports.filter(i => i.order_id)

  async function bewerkKlant(formData: FormData) {
    'use server'
    const naam = (formData.get('naam') as string ?? '').trim()
    if (!naam) return
    await updateKlant(id, {
      naam,
      adres: formData.get('adres') as string,
      postcode: formData.get('postcode') as string,
      stad: formData.get('stad') as string,
      land: formData.get('land') as string,
    })
    revalidatePath(`/klanten/${id}`)
  }

  return (
    <div className="max-w-3xl">
      {/* Klantinfo + bewerken */}
      <KlantBewerkFormulier klant={klant} bewerkAction={bewerkKlant} />

      {/* Orders overzicht */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Orders</h2>

        {alleOrders.length === 0 && (
          <p className="text-sm text-gray-400">Nog geen orders voor deze klant.</p>
        )}

        <OrderGroepTabel titel="Lopend" orders={groepen.lopend} />
        <OrderGroepTabel titel="Vracht klaar" orders={groepen.vracht_klaar} />
        <OrderGroepTabel titel="Opgehaald" orders={groepen.opgehaald} />
      </section>

      {/* Give-X imports sectie */}
      {isGiveX && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Imports</h2>

          <ImportDropzone klantId={id} />

          {ongematchteImports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">
                Nog te koppelen ({ongematchteImports.length})
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left py-2 font-medium text-gray-600">Document</th>
                    <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
                    <th className="text-right py-2 font-medium text-gray-600">Stuks</th>
                  </tr>
                </thead>
                <tbody>
                  {ongematchteImports.map(imp => (
                    <tr key={imp.id} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-sm">{imp.instructie_code}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.documentnummer}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.leverdatum ?? '—'}</td>
                      <td className="py-2 text-right">{imp.totaal_hoeveelheid.toLocaleString('nl-NL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gematchteImports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Verwerkt ({gematchteImports.length})
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left py-2 font-medium text-gray-600">Order</th>
                    <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
                    <th className="text-right py-2 font-medium text-gray-600">Stuks</th>
                  </tr>
                </thead>
                <tbody>
                  {gematchteImports.map(imp => (
                    <tr key={imp.id} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-sm">{imp.instructie_code}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.order?.order_nummer ?? '—'}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.leverdatum ?? '—'}</td>
                      <td className="py-2 text-right">{imp.totaal_hoeveelheid.toLocaleString('nl-NL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function OrderGroepTabel({ titel, orders }: { titel: string; orders: OrderMetVrachten[] }) {
  if (orders.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{titel} ({orders.length})</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-left py-2 font-medium text-gray-600">Code</th>
            <th className="text-right py-2 font-medium text-gray-600">Stuks</th>
            <th className="text-left py-2 pl-12 font-medium text-gray-600">Deadline</th>
            <th className="text-left py-2 font-medium text-gray-600">Vracht</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 font-medium">
                <Link href={`/orders/${order.id}`} className="hover:underline">
                  {order.order_nummer}
                </Link>
              </td>
              <td className="py-2 text-gray-500 font-mono text-xs">{order.order_code}</td>
              <td className="py-2 text-right">{order.order_grootte.toLocaleString('nl-NL')}</td>
              <td className="py-2 pl-12 text-gray-500 text-xs">{order.deadline ?? '—'}</td>
              <td className="py-2 text-gray-500 text-xs">
                {order.vrachten.length > 0
                  ? order.vrachten.map(v => v.vrachtbrief_nummer).join(', ')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
