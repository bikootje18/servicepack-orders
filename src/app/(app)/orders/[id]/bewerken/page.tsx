import { redirect } from 'next/navigation'
import { getOrder, updateOrder, deleteOrder } from '@/lib/db/orders'
import { getLeveringen } from '@/lib/db/leveringen'
import { getKlanten } from '@/lib/db/klanten'
import { getCodes, getCodeByCode } from '@/lib/db/codes'
import { getArtikelenVoorOrder } from '@/lib/db/artikelen'
import { ArtikelenForm } from '@/components/orders/ArtikelenForm'
import { VerwijderOrderKnop } from '@/components/orders/VerwijderOrderKnop'
import { LOCATIES } from '@/lib/constants/locaties'
import { PALLET_OPTIES } from '@/lib/constants/pallets'

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

  async function slaOpgeslagenOp(formData: FormData) {
    'use server'
    const locatie = formData.get('locatie') as string
    if (!locatie) throw new Error('Locatie is verplicht')
    const codeText = (formData.get('facturatie_code') as string ?? '').trim()
    const gevondenCode = codeText ? await getCodeByCode(codeText) : null
    if (codeText && !gevondenCode) throw new Error(`Facturatie code '${codeText}' niet gevonden`)
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
      <form action={slaOpgeslagenOp} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordernummer *</label>
            <input name="order_nummer" required defaultValue={order.order_nummer}
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order code *</label>
            <input name="order_code" required defaultValue={order.order_code}
              className="form-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Klant *</label>
            <select name="klant_id" required defaultValue={order.klant_id}
              className="form-select">
              {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code</label>
            <input name="facturatie_code" list="codes-datalist-bewerken"
              defaultValue={order.facturatie_code?.code ?? ''}
              placeholder="Optioneel"
              className="form-input" autoComplete="off" />
            <datalist id="codes-datalist-bewerken">
              {codes.map(c => <option key={c.id} value={c.code}>{c.omschrijving}</option>)}
            </datalist>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order grootte *</label>
          <input name="order_grootte" type="number" min="1" required defaultValue={order.order_grootte}
            className="form-input" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Locatie *</label>
            <select name="locatie" required defaultValue={order.locatie ?? ''}
              className="form-select">
              <option value="">Selecteer locatie...</option>
              {LOCATIES.map(l => <option key={l.waarde} value={l.waarde}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input name="deadline" type="date" defaultValue={order.deadline ?? ''}
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">THT</label>
            <input name="tht" type="date" defaultValue={order.tht ?? ''}
              className="form-input" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per doos</label>
            <input name="aantal_per_doos" type="number" min="0" defaultValue={order.aantal_per_doos}
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per inner</label>
            <input name="aantal_per_inner" type="number" min="0" defaultValue={order.aantal_per_inner}
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per pallet</label>
            <input name="aantal_per_pallet" type="number" min="0" defaultValue={order.aantal_per_pallet}
              className="form-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pallettype</label>
            <select name="pallet_type" defaultValue={order.pallet_type ?? 'chep'} className="form-select">
              {PALLET_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bewerking</label>
          <input name="bewerking" type="number" min="0" defaultValue={order.bewerking}
            className="form-input" />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input name="opwerken" type="checkbox" id="opwerken" defaultChecked={order.opwerken} className="form-checkbox" />
            <label htmlFor="opwerken" className="text-sm font-medium text-gray-700">Opwerken</label>
          </div>
          <div className="flex items-center gap-2">
            <input name="bio" type="checkbox" id="bio" defaultChecked={order.bio} className="form-checkbox" />
            <label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
          <textarea name="omschrijving" rows={3} defaultValue={order.omschrijving}
            className="form-textarea" />
        </div>

        <ArtikelenForm
          initialArtikelen={artikelen}
          defaultOrderGrootte={order.order_grootte}
        />

        <div className="flex gap-3">
          <button type="submit"
            className="btn-primary px-6">
            Opslaan
          </button>
          <a href={`/orders/${id}`} className="px-6 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50">
            Annuleren
          </a>
        </div>
      </form>

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
