'use server'

import { createClient } from '@/lib/supabase/server'
import type { VoorraadRegel } from '@/types'

export function groepeerdOpKlant(regels: VoorraadRegel[]): Record<string, VoorraadRegel[]> {
  const actief = regels.filter(r => r.resterend > 0)
  return actief.reduce((acc, regel) => {
    if (!acc[regel.klant_naam]) acc[regel.klant_naam] = []
    acc[regel.klant_naam].push(regel)
    return acc
  }, {} as Record<string, VoorraadRegel[]>)
}

export async function getVoorraad(): Promise<VoorraadRegel[]> {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_nummer,
      order_grootte,
      klant:klanten(naam),
      leveringen(aantal_geleverd)
    `)
    .not('status', 'eq', 'gefactureerd')

  if (error) throw error

  return (orders ?? []).map(order => {
    const totaalGeleverd = (order.leveringen ?? []).reduce(
      (sum: number, l: { aantal_geleverd: number }) => sum + l.aantal_geleverd, 0
    )
    return {
      order_id: order.id,
      order_nummer: order.order_nummer,
      klant_naam: (order.klant as any)?.naam ?? '–',
      order_grootte: order.order_grootte,
      totaal_geleverd: totaalGeleverd,
      resterend: Math.max(0, order.order_grootte - totaalGeleverd),
    }
  })
}
