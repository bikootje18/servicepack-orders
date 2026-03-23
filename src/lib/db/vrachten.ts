import { createClient } from '@/lib/supabase/server'
import type { Vracht, Levering, Order } from '@/types'

export function berekenVrachtBedrag(
  regels: { aantal_geleverd: number; tarief: number }[]
): number {
  const totaal = regels.reduce((sum, r) => sum + r.tarief * r.aantal_geleverd, 0)
  return Math.round(totaal * 100) / 100
}

export async function getVrachten(): Promise<Vracht[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vrachten')
    .select('*, klant:klanten(naam), factuur:facturen(id, factuur_nummer, status, totaal_bedrag)')
    .order('datum', { ascending: false })
  if (error) throw error
  return data as Vracht[]
}

export async function getVracht(id: string): Promise<Vracht> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vrachten')
    .select(`
      *,
      klant:klanten(*),
      regels:vracht_regels(
        *,
        levering:leveringen(
          *,
          order:orders(
            *,
            facturatie_code:facturatie_codes(*)
          )
        )
      ),
      factuur:facturen(id, factuur_nummer, status, totaal_bedrag)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Vracht
}

export async function getOngefactureerdeLeveringenVoorKlant(
  klantId: string
): Promise<(Levering & { order: Order & { facturatie_code: { tarief: number; code: string } } })[]> {
  const supabase = await createClient()

  // Get orders for this klant
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('klant_id', klantId)
  if (ordersError) throw ordersError
  const orderIds = orders.map(o => o.id)
  if (orderIds.length === 0) return []

  // Get all unfactured leveringen for these orders
  const { data: leveringen, error } = await supabase
    .from('leveringen')
    .select('*, order:orders(*, klant:klanten(naam), facturatie_code:facturatie_codes(tarief, code))')
    .in('order_id', orderIds)
    .is('factuur_id', null)
    .order('leverdatum')
  if (error) throw error

  if (leveringen.length === 0) return []

  // Get only the levering_ids from the above set that are already in a vracht
  const leveringIds = leveringen.map(l => l.id)
  const { data: inVracht, error: vrachtError } = await supabase
    .from('vracht_regels')
    .select('levering_id')
    .in('levering_id', leveringIds)
  if (vrachtError) throw vrachtError
  const inVrachtIds = new Set(inVracht.map(r => r.levering_id))

  return leveringen.filter(l => !inVrachtIds.has(l.id)) as (Levering & { order: Order & { facturatie_code: { tarief: number; code: string } } })[]
}

export async function createVracht(data: {
  klant_id: string
  datum: string
  notities: string
  levering_ids: string[]
}): Promise<Vracht> {
  const supabase = await createClient()

  const { data: vracht, error: vrachtError } = await supabase
    .from('vrachten')
    .insert({
      klant_id: data.klant_id,
      datum: data.datum,
      notities: data.notities,
    })
    .select()
    .single()
  if (vrachtError) throw vrachtError

  const regels = data.levering_ids.map(levering_id => ({
    vracht_id: vracht.id,
    levering_id,
  }))

  const { error: regelsError } = await supabase
    .from('vracht_regels')
    .insert(regels)
  if (regelsError) throw regelsError

  return vracht as Vracht
}
