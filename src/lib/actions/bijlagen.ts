'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveBijlage(data: {
  order_id: string
  bestandsnaam: string
  opslag_pad: string
  bestandsgrootte: number
  mime_type: string
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('order_bijlagen').insert(data)
  if (error) throw error
  revalidatePath(`/orders/${data.order_id}`)
}

export async function deleteBijlage(id: string, opslagPad: string, orderId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.storage.from('order-bijlagen').remove([opslagPad])
  const { error } = await supabase.from('order_bijlagen').delete().eq('id', id)
  if (error) throw error
  revalidatePath(`/orders/${orderId}`)
}
