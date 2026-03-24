'use server'

import { revalidatePath } from 'next/cache'
import { createLevering as dbCreateLevering } from '@/lib/db/leveringen'

export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  aangemaakt_door: string | null
}): Promise<void> {
  await dbCreateLevering(data)
  revalidatePath(`/orders/${data.order_id}`)
}
