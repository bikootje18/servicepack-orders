import { createClient } from '@/lib/supabase/server'
import type { PortalOrder } from '@/types'

export async function getPortalOrders(klantId: string): Promise<PortalOrder[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_nummer,
      order_code,
      status,
      order_grootte,
      deadline,
      tht,
      pallet_type,
      aantal_per_doos,
      aantal_per_inner,
      aantal_per_pallet,
      leveringen (
        id,
        leverdatum,
        aantal_geleverd,
        notities
      )
    `)
    .eq('klant_id', klantId)
    .order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data as PortalOrder[]
}
