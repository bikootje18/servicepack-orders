'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function meldOrderGereed(orderId: string, locatie: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'geleverd' })
    .eq('id', orderId)
    .eq('status', 'in_behandeling') // alleen als het nog in behandeling is
  if (error) throw error
  revalidatePath(`/locatie/${locatie}`)
}
