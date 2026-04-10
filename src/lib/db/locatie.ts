import { createClient } from '@/lib/supabase/server'
import { LOCATIES, type Locatie } from '@/lib/constants/locaties'
import type { Order } from '@/types'

export function isGeldigeLocatie(waarde: string): waarde is Locatie {
  return LOCATIES.some(l => l.waarde === waarde)
}

export interface LocatieOrders {
  inBehandeling: Order[]
  bevestigd: Order[]
}

export async function getOrdersVoorLocatie(locatie: Locatie): Promise<LocatieOrders> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_nummer, order_code, omschrijving, bewerking, status, order_grootte, deadline, tht, locatie, aangemaakt_op')
    .in('status', ['in_behandeling', 'bevestigd'])
    .eq('locatie', locatie)
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) throw error

  const inBehandeling: Order[] = []
  const bevestigd: Order[] = []

  for (const order of data as Order[]) {
    if (order.status === 'in_behandeling') inBehandeling.push(order)
    else bevestigd.push(order)
  }

  return { inBehandeling, bevestigd }
}
