'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createLevering as dbCreateLevering, deleteLevering as dbDeleteLevering, updateLevering as dbUpdateLevering } from '@/lib/db/leveringen'
import { createVracht } from '@/lib/db/vrachten'
import { createVrachtFactuur as dbCreateFactuur } from '@/lib/db/facturen'

export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  tht?: string | null
  aangemaakt_door: string | null
}): Promise<void> {
  await dbCreateLevering(data)
  revalidatePath(`/orders/${data.order_id}`)
}

export async function deleteLevering(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const orderId = formData.get('order_id') as string
  await dbDeleteLevering(id)
  redirect(`/orders/${orderId}`)
}

export async function updateLevering(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const orderId = formData.get('order_id') as string
  const aantalNum = parseInt(formData.get('aantal_geleverd') as string) || 0
  if (aantalNum <= 0) {
    await dbDeleteLevering(id)
  } else {
    await dbUpdateLevering(id, {
      aantal_geleverd: aantalNum,
      leverdatum: formData.get('leverdatum') as string,
      notities: (formData.get('notities') as string) ?? '',
      tht: (formData.get('tht') as string) || null,
    })
  }
  redirect(`/orders/${orderId}`)
}

export async function gereedmeldenEnVrachtAanmaken(data: {
  order_id: string
  klant_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  tht?: string | null
}): Promise<void> {
  const levering = await dbCreateLevering({
    order_id: data.order_id,
    aantal_geleverd: data.aantal_geleverd,
    leverdatum: data.leverdatum,
    notities: data.notities,
    tht: data.tht ?? null,
    aangemaakt_door: null,
  })

  const vracht = await createVracht({
    klant_id:         data.klant_id,
    datum:            data.leverdatum,
    notities:         '',
    levering_ids:     [levering.id],
    aantallen:        {},
    aflever_naam:     null,
    aflever_adres:    null,
    aflever_postcode: null,
    aflever_stad:     null,
    aflever_land:     null,
    aangemaakt_door:  null,
  })

  await dbCreateFactuur(vracht.id)
  redirect(`/vrachten/${vracht.id}/klaar`)
}
