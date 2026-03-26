import { createClient } from '@/lib/supabase/server'
import type { OrderBijlage } from '@/types'

export async function getBijlagen(orderId: string): Promise<OrderBijlage[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('order_bijlagen')
    .select('*')
    .eq('order_id', orderId)
    .order('aangemaakt_op', { ascending: false })
  if (error) throw error

  // Genereer signed URLs (geldig 1 uur)
  const bijlagen = await Promise.all(
    (data as OrderBijlage[]).map(async (b) => {
      const { data: signed } = await supabase.storage
        .from('order-bijlagen')
        .createSignedUrl(b.opslag_pad, 3600)
      return { ...b, url: signed?.signedUrl }
    })
  )

  return bijlagen
}

export async function deleteBijlageRecord(id: string, opslagPad: string): Promise<void> {
  const supabase = await createClient()

  await supabase.storage.from('order-bijlagen').remove([opslagPad])

  const { error } = await supabase.from('order_bijlagen').delete().eq('id', id)
  if (error) throw error
}
