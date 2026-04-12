'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createLevering } from '@/lib/db/leveringen'

export async function locatieMeldGereed(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const orderId    = formData.get('order_id') as string
  const locatie    = formData.get('locatie') as string
  const aantalStr  = formData.get('aantal_geleverd') as string
  const leverdatum = formData.get('leverdatum') as string
  const tht        = (formData.get('tht') as string) || null
  const notities   = (formData.get('notities') as string) || ''
  const urenStr    = (formData.get('uren') as string) || ''
  const uren       = urenStr ? parseFloat(urenStr) : null

  const aantal = parseInt(aantalStr)
  if (!aantal || aantal <= 0 || !leverdatum) return

  await createLevering({
    order_id: orderId,
    aantal_geleverd: aantal,
    leverdatum,
    notities,
    tht,
    uren,
    aangemaakt_door: user?.id ?? null,
  })

  revalidatePath(`/locatie/${locatie}/orders/${orderId}`)
  revalidatePath(`/locatie/${locatie}`)
}
