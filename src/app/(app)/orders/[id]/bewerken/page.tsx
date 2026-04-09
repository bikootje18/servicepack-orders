import { redirect } from 'next/navigation'
import { getOrder, updateOrder, deleteOrder } from '@/lib/db/orders'
import { getLeveringen } from '@/lib/db/leveringen'
import { getKlanten } from '@/lib/db/klanten'
import { getCodes, getCodeByCode } from '@/lib/db/codes'
import { getArtikelenVoorOrder } from '@/lib/db/artikelen'
import { OrderFormulier } from '@/components/orders/OrderFormulier'
import { VerwijderOrderKnop } from '@/components/orders/VerwijderOrderKnop'

export default async function BewerkenOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [order, klanten, codes, artikelen, leveringen] = await Promise.all([
    getOrder(id),
    getKlanten(),
    getCodes(),
    getArtikelenVoorOrder(id),
    getLeveringen(id),
  ])

  async function slaOpgeslagenOp(_prevState: { error: string } | null, formData: FormData) {
    'use server'
    const locatie = formData.get('locatie') as string
    if (!locatie) return { error: 'Selecteer een locatie' }
    const codeText = (formData.get('facturatie_code') as string ?? '').trim()
    const gevondenCode = codeText ? await getCodeByCode(codeText) : null
    if (codeText && !gevondenCode) return { error: `Facturatie code "${codeText}" bestaat niet. Kies een code uit de lijst of laat het veld leeg.` }
    await updateOrder(id, {
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
      pallet_type: (formData.get('pallet_type') as string || 'chep') as any,
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
      await saveArtikelen(id, regels)
    }
    redirect(`/orders/${id}`)
  }

  async function verwijderOrder() {
    'use server'
    await deleteOrder(id)
    redirect('/orders')
  }

  const kanVerwijderen = leveringen.length === 0

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Order bewerken: {order.order_nummer}</h1>
      <OrderFormulier
        action={slaOpgeslagenOp}
        klanten={klanten}
        codes={codes}
        initialArtikelen={artikelen}
        defaultValues={{
          order_nummer: order.order_nummer,
          order_code: order.order_code,
          klant_id: order.klant_id,
          facturatie_code_code: order.facturatie_code?.code,
          order_grootte: order.order_grootte,
          locatie: order.locatie,
          deadline: order.deadline,
          tht: order.tht,
          aantal_per_doos: order.aantal_per_doos,
          aantal_per_inner: order.aantal_per_inner,
          aantal_per_pallet: order.aantal_per_pallet,
          pallet_type: order.pallet_type,
          bewerking: order.bewerking,
          opwerken: order.opwerken,
          bio: order.bio,
          omschrijving: order.omschrijving,
        }}
        submitLabel="Opslaan"
        cancelHref={`/orders/${id}`}
      />

      <div className="mt-8">
{kanVerwijderen ? (
          <VerwijderOrderKnop orderId={id} orderNummer={order.order_nummer} />
        ) : (
          <p className="text-sm text-gray-400">Order kan niet worden verwijderd — er zijn al gereedmeldingen geregistreerd.</p>
        )}
      </div>
    </div>
  )
}
