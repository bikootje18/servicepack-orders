import { createClient } from '@/lib/supabase/server'
import type { Levering } from '@/types'

export function validateLevering(data: {
  aantal_geleverd: number
  resterend: number
  leverdatum: string
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.aantal_geleverd || data.aantal_geleverd <= 0)
    errors.aantal_geleverd = 'Aantal moet groter zijn dan 0'
  if (data.aantal_geleverd > data.resterend)
    errors.aantal_geleverd = `Maximaal ${data.resterend} eenheden resterend`
  if (!data.leverdatum)
    errors.leverdatum = 'Leverdatum is verplicht'
  return errors
}

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

export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  aangemaakt_door: string | null
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('leveringen').insert(data)
  if (error) throw error
}
