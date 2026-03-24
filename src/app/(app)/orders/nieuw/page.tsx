import { redirect } from 'next/navigation'
import { getKlanten } from '@/lib/db/klanten'
import { getCodes, getCodeByCode } from '@/lib/db/codes'
import { createOrder } from '@/lib/db/orders'
import { createClient } from '@/lib/supabase/server'

export default async function NieuweOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ kloon?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    const codeText = (formData.get('facturatie_code') as string ?? '').trim()
    const gevondenCode = await getCodeByCode(codeText)
    if (!gevondenCode) throw new Error(`Facturatie code '${codeText}' niet gevonden`)
    const order = await createOrder({
      order_nummer: formData.get('order_nummer') as string,
      order_code: formData.get('order_code') as string,
      klant_id: formData.get('klant_id') as string,
      facturatie_code_id: gevondenCode.id,
      order_grootte: parseInt(formData.get('order_grootte') as string),
      aantal_per_doos: parseInt(formData.get('aantal_per_doos') as string) || 0,
      aantal_per_inner: parseInt(formData.get('aantal_per_inner') as string) || 0,
      aantal_per_pallet: parseInt(formData.get('aantal_per_pallet') as string) || 0,
      bewerking: formData.get('bewerking') as string || '',
      opwerken: formData.get('opwerken') === 'on',
      omschrijving: formData.get('omschrijving') as string || '',
      aangemaakt_door: null,
    })
    redirect(`/orders/${order.id}?print=1`)
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
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order code *</label>
            <input name="order_code" required defaultValue={v?.order_code}
              className="form-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Klant *</label>
            <select name="klant_id" required defaultValue={v?.klant_id}
              className="form-select">
              <option value="">Selecteer klant...</option>
              {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code *</label>
            <input name="facturatie_code" list="codes-datalist" required
              defaultValue={v?.facturatie_code?.code ?? ''}
              placeholder="Type code..."
              className="form-input" autoComplete="off" />
            <datalist id="codes-datalist">
              {codes.map(c => <option key={c.id} value={c.code}>{c.omschrijving}</option>)}
            </datalist>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order grootte *</label>
          <input name="order_grootte" type="number" min="1" required defaultValue={v?.order_grootte}
            className="form-input" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per doos</label>
            <input name="aantal_per_doos" type="number" min="0" defaultValue={v?.aantal_per_doos ?? 0}
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per inner</label>
            <input name="aantal_per_inner" type="number" min="0" defaultValue={v?.aantal_per_inner ?? 0}
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per pallet</label>
            <input name="aantal_per_pallet" type="number" min="0" defaultValue={v?.aantal_per_pallet ?? 0}
              className="form-input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bewerking</label>
          <input name="bewerking" defaultValue={v?.bewerking}
            className="form-input" />
        </div>

        <div className="flex items-center gap-2">
          <input name="opwerken" type="checkbox" id="opwerken" defaultChecked={v?.opwerken} className="form-checkbox" />
          <label htmlFor="opwerken" className="text-sm font-medium text-gray-700">Opwerken</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
          <textarea name="omschrijving" rows={3} defaultValue={v?.omschrijving}
            className="form-textarea" />
        </div>

        <div className="flex gap-3">
          <button type="submit"
            className="btn-primary px-6">
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
