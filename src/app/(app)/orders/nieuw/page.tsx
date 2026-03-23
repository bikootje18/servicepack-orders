import { redirect } from 'next/navigation'
import { getKlanten } from '@/lib/db/klanten'
import { getCodes } from '@/lib/db/codes'
import { createOrder } from '@/lib/db/orders'
import { createClient } from '@/lib/supabase/server'

export default async function NieuweOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ kloon?: string }>
}) {
  const params = await searchParams
  const klanten = await getKlanten()
  const codes = await getCodes()

  // If kloon param, pre-fill from existing order
  let kloonOrder = null
  if (params.kloon) {
    const { getOrder } = await import('@/lib/db/orders')
    kloonOrder = await getOrder(params.kloon)
  }

  async function slaOrderOp(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const order = await createOrder({
      order_nummer: formData.get('order_nummer') as string,
      order_code: formData.get('order_code') as string,
      klant_id: formData.get('klant_id') as string,
      facturatie_code_id: formData.get('facturatie_code_id') as string,
      order_grootte: parseInt(formData.get('order_grootte') as string),
      aantal_per_doos: parseInt(formData.get('aantal_per_doos') as string) || 0,
      aantal_per_inner: parseInt(formData.get('aantal_per_inner') as string) || 0,
      aantal_per_pallet: parseInt(formData.get('aantal_per_pallet') as string) || 0,
      bewerking: formData.get('bewerking') as string || '',
      opwerken: formData.get('opwerken') === 'on',
      omschrijving: formData.get('omschrijving') as string || '',
      aangemaakt_door: user?.id ?? null,
    })
    redirect(`/orders/${order.id}`)
  }

  const v = kloonOrder

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">
        {v ? `Kloon van ${v.order_nummer}` : 'Nieuwe order'}
      </h1>
      <form action={slaOrderOp} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordernummer *</label>
            <input name="order_nummer" required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order code *</label>
            <input name="order_code" required defaultValue={v?.order_code}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Klant *</label>
            <select name="klant_id" required defaultValue={v?.klant_id}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Selecteer klant...</option>
              {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code *</label>
            <select name="facturatie_code_id" required defaultValue={v?.facturatie_code_id}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Selecteer code...</option>
              {codes.map(c => <option key={c.id} value={c.id}>{c.code} – {c.omschrijving}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order grootte *</label>
          <input name="order_grootte" type="number" min="1" required defaultValue={v?.order_grootte}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per doos</label>
            <input name="aantal_per_doos" type="number" min="0" defaultValue={v?.aantal_per_doos ?? 0}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per inner</label>
            <input name="aantal_per_inner" type="number" min="0" defaultValue={v?.aantal_per_inner ?? 0}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per pallet</label>
            <input name="aantal_per_pallet" type="number" min="0" defaultValue={v?.aantal_per_pallet ?? 0}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bewerking</label>
          <input name="bewerking" defaultValue={v?.bewerking}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-2">
          <input name="opwerken" type="checkbox" id="opwerken" defaultChecked={v?.opwerken} />
          <label htmlFor="opwerken" className="text-sm font-medium text-gray-700">Opwerken</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
          <textarea name="omschrijving" rows={3} defaultValue={v?.omschrijving}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-3">
          <button type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700">
            Order opslaan
          </button>
          <a href="/orders" className="px-6 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50">
            Annuleren
          </a>
        </div>
      </form>
    </div>
  )
}
