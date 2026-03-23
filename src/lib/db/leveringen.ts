'use server'
import { createClient } from '@/lib/supabase/server'
import type { Levering } from '@/types'

export async function getLeveringen(orderId: string): Promise<Levering[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leveringen')
    .select('*')
    .eq('order_id', orderId)
    .order('leverdatum', { ascending: false })
  if (error) throw error
  return data
}
