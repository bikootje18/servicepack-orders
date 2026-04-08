import { redirect } from 'next/navigation'
import { getKlanten } from '@/lib/db/klanten'
import { getCodes, getCodeByCode } from '@/lib/db/codes'
import { createOrder } from '@/lib/db/orders'
import { createClient } from '@/lib/supabase/server'
import { LOCATIES } from '@/lib/constants/locaties'
import { ArtikelenForm } from '@/components/orders/ArtikelenForm'

export default async function NieuweOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ kloon?: string; zoek?: string; klant_id?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const klanten = await getKlanten()
  const codes = await getCodes()

  // Zoekresultaten voor kloon
  let zoekResultaten: import('@/types').Order[] = []
  if (params.zoek && params.zoek.trim()) {
    const { getOrders } = await import('@/lib/db/orders')
    const { orders } = await getOrders(1, 8, params.zoek.trim())
    zoekResultaten = orders
  }

  // If kloon param, pre-fill from existing order
  let kloonOrder = null
  if (params.kloon) {
    const { getOrder } = await import('@/lib/db/orders')
    kloonOrder = await getOrder(params.kloon)
  }

  // Auto-kopie artikelen: kloon heeft voorrang boven klant_id auto-kopie
  let initialArtikelen: import('@/types').OrderArtikel[] = []
  if (kloonOrder) {
    const { getArtikelenVoorOrder } = await import('@/lib/db/artikelen')
    initialArtikelen = await getArtikelenVoorOrder(kloonOrder.id)
  } else if (params.klant_id) {
    const { getLaatsteArtikelenVoorKlant } = await import('@/lib/db/artikelen')
    initialArtikelen = await getLaatsteArtikelenVoorKlant(params.klant_id)
  }

  async function slaOrderOp(formData: FormData) {
    'use server'
    const locatie = formData.get('locatie') as string
    if (!locatie) throw new Error('Locatie is verplicht')
    const codeText = (formData.get('facturatie_code') as string ?? '').trim()
    const gevondenCode = codeText ? await getCodeByCode(codeText) : null
    if (codeText && !gevondenCode) throw new Error(`Facturatie code '${codeText}' niet gevonden`)
    const order = await createOrder({
      order_nummer: formData.get('order_nummer') as string,
      order_code: formData.get('order_code') as string,
      klant_id: formData.get('klant_id') as string,
      facturatie_code_id: gevondenCode?.id ?? null,
      order_grootte: parseInt(formData.get('order_grootte') as string),
      aantal_per_doos: parseInt(formData.get('aantal_per_doos') as string) || 0,
      aantal_per_inner: parseInt(formData.get('aantal_per_inner') as string) || 0,
      aantal_per_pallet: parseInt(formData.get('aantal_per_pallet') as string) || 0,
      bewerking: formData.get('bewerking') as string || '',
      opwerken: formData.get('opwerken') === 'on',
      bio: formData.get('bio') === 'on',
      omschrijving: formData.get('omschrijving') as string || '',
      locatie,
      deadline: formData.get('deadline') as string || null,
      tht: formData.get('tht') as string || null,
      aangemaakt_door: null,
    })
    // Artikelen opslaan als de sectie geopend was bij submit
    if (formData.get('artikelen_geopend') === 'true') {
      const count = parseInt(formData.get('artikelen_count') as string ?? '0')
      const regels: Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }> = []
      for (let i = 0; i < count; i++) {
        const naam = (formData.get(`artikel_naam_${i}`) as string ?? '').trim()
        const type = formData.get(`artikel_type_${i}`) as string
        const factor = parseFloat(formData.get(`artikel_factor_${i}`) as string ?? '0')
        if (naam && (type === 'delen' || type === 'vermenigvuldigen') && factor > 0) {
          regels.push({ naam, berekening_type: type as 'delen' | 'vermenigvuldigen', factor })
        }
      }
      const { saveArtikelen } = await import('@/lib/db/artikelen')
      await saveArtikelen(order.id, regels)
    }
    redirect(`/orders/${order.id}?print=1`)
  }

  const v = kloonOrder

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">
        {v ? `Kloon van ${v.order_nummer}` : 'Nieuwe order'}
      </h1>

      {/* Zoek bestaand order om te kopiëren */}
      {!v && (
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Kopiëren van bestaand order</p>
          <form method="GET" className="flex gap-2">
            <input
              name="zoek"
              defaultValue={params.zoek ?? ''}
              placeholder="Zoek op order code of ordernummer..."
              className="form-input flex-1"
              autoComplete="off"
            />
            <button type="submit" className="btn-primary px-5">Zoeken</button>
          </form>

          {params.zoek && zoekResultaten.length === 0 && (
            <p className="text-sm text-gray-400 mt-3">Geen orders gevonden voor &ldquo;{params.zoek}&rdquo;</p>
          )}

          {zoekResultaten.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
              {zoekResultaten.map(order => (
                <a
                  key={order.id}
                  href={`/orders/nieuw?kloon=${order.id}`}
                  className="group flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors"
                >
                  <span className="font-mono text-sm font-bold text-gray-900 w-24 flex-shrink-0">{order.order_nummer}</span>
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex-shrink-0">{order.order_code}</span>
                  <span className="text-sm text-gray-500 flex-1 truncate">{order.klant?.naam}</span>
                  <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">Kopiëren →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code</label>
            <input name="facturatie_code" list="codes-datalist"
              defaultValue={v?.facturatie_code?.code ?? ''}
              placeholder="Optioneel"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Locatie *</label>
            <select name="locatie" required defaultValue={v?.locatie ?? ''}
              className="form-select">
              <option value="">Selecteer locatie...</option>
              {LOCATIES.map(l => <option key={l.waarde} value={l.waarde}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input name="deadline" type="date" defaultValue={v?.deadline ?? ''}
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">THT</label>
            <input name="tht" type="date" defaultValue={v?.tht ?? ''}
              className="form-input" />
          </div>
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input name="opwerken" type="checkbox" id="opwerken" defaultChecked={v?.opwerken} className="form-checkbox" />
            <label htmlFor="opwerken" className="text-sm font-medium text-gray-700">Opwerken</label>
          </div>
          <div className="flex items-center gap-2">
            <input name="bio" type="checkbox" id="bio" defaultChecked={v?.bio} className="form-checkbox" />
            <label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
          <textarea name="omschrijving" rows={3} defaultValue={v?.omschrijving}
            className="form-textarea" />
        </div>

        <ArtikelenForm
          initialArtikelen={initialArtikelen}
          defaultOrderGrootte={v?.order_grootte ?? null}
        />

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
