'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createLevering as dbCreateLevering } from '@/lib/db/leveringen'
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
    klant_id: data.klant_id,
    datum: data.leverdatum,
    notities: '',
    levering_ids: [levering.id],
  })

  await dbCreateFactuur(vracht.id)
  redirect(`/vrachten/${vracht.id}/klaar`)
}
