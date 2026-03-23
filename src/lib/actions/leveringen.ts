'use server'

import { createLevering as dbCreateLevering } from '@/lib/db/leveringen'

export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  aangemaakt_door: string | null
}): Promise<void> {
  return dbCreateLevering(data)
}
