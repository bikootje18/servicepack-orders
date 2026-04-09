import { redirect } from 'next/navigation'
import { getKlanten } from '@/lib/db/klanten'
import { getCodes, getCodeByCode } from '@/lib/db/codes'
import { createOrder } from '@/lib/db/orders'
import { createClient } from '@/lib/supabase/server'
import { OrderFormulier } from '@/components/orders/OrderFormulier'

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

  async function slaOrderOp(_prevState: { error: string } | null, formData: FormData) {
    'use server'
    const locatie = formData.get('locatie') as string
    if (!locatie) return { error: 'Selecteer een locatie' }
    const codeText = (formData.get('facturatie_code') as string ?? '').trim()
    const gevondenCode = codeText ? await getCodeByCode(codeText) : null
    if (codeText && !gevondenCode) return { error: `Facturatie code "${codeText}" bestaat niet. Kies een code uit de lijst of laat het veld leeg.` }
    const order = await createOrder({
      order_nummer: formData.get('order_nummer') as string,
      order_code: formData.get('order_code') as string,
      klant_id: formData.get('klant_id') as string,
      facturatie_code_id: gevondenCode?.id ?? null,
      order_grootte: parseInt(formData.get('order_grootte') as string),
      aantal_per_doos: parseInt(formData.get('aantal_per_doos') as string) || 0,
      aantal_per_inner: parseInt(formData.get('aantal_per_inner') as string) || 0,
      aantal_per_pallet: parseInt(formData.get('aantal_per_pallet') as string) || 0,
      pallet_type: (formData.get('pallet_type') as string || 'chep') as any,
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

      <OrderFormulier
        action={slaOrderOp}
        klanten={klanten}
        codes={codes}
        initialArtikelen={initialArtikelen}
        defaultValues={{
          order_code: v?.order_code,
          klant_id: v?.klant_id,
          facturatie_code_code: v?.facturatie_code?.code,
          order_grootte: v?.order_grootte,
          locatie: v?.locatie,
          deadline: v?.deadline,
          tht: v?.tht,
          aantal_per_doos: v?.aantal_per_doos,
          aantal_per_inner: v?.aantal_per_inner,
          aantal_per_pallet: v?.aantal_per_pallet,
          pallet_type: (v as any)?.pallet_type,
          bewerking: v?.bewerking,
          opwerken: v?.opwerken,
          bio: v?.bio,
          omschrijving: v?.omschrijving,
        }}
        submitLabel="Order opslaan"
        cancelHref="/orders"
      />
    </div>
  )
}
