import { createClient } from '@/lib/supabase/server'
import type { Factuur, Levering, Order } from '@/types'

export function berekenFactuurBedrag(tarief: number, totaalEenheden: number): number {
  return Math.round(tarief * totaalEenheden * 100) / 100
}

export async function getFacturen(): Promise<Factuur[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('facturen')
    .select('*, order:orders(id, order_nummer, klant:klanten(naam)), vracht:vrachten(id, vrachtbrief_nummer, klant:klanten(naam))')
    .order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data as Factuur[]
}

export async function getFactuur(id: string): Promise<Factuur> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('facturen')
    .select('*, order:orders(*, klant:klanten(naam), facturatie_code:facturatie_codes(code, omschrijving)), vracht:vrachten(*, klant:klanten(naam))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Factuur
}

export async function getOngefactureerdeLeveringen(orderId: string): Promise<Levering[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leveringen')
    .select('*')
    .eq('order_id', orderId)
    .is('factuur_id', null)
    .order('leverdatum')
  if (error) throw error
  return data
}

export async function createFactuur(data: {
  order_id: string
  levering_ids: string[]
  tarief: number
  aangemaakt_door: string | null
}): Promise<Factuur> {
  const supabase = await createClient()

  const { data: leveringen, error: leveringenError } = await supabase
    .from('leveringen')
    .select('aantal_geleverd')
    .in('id', data.levering_ids)
  if (leveringenError) throw leveringenError

  const totaalEenheden = leveringen.reduce((sum, l) => sum + l.aantal_geleverd, 0)
  const totaalBedrag = berekenFactuurBedrag(data.tarief, totaalEenheden)

  const { data: factuurNummer, error: seqError } = await supabase.rpc('generate_factuur_nummer')
  if (seqError) throw seqError

  const { data: factuur, error: factuurError } = await supabase
    .from('facturen')
    .insert({
      factuur_nummer: factuurNummer,
      order_id: data.order_id,
      totaal_eenheden: totaalEenheden,
      tarief: data.tarief,
      totaal_bedrag: totaalBedrag,
      factuurdatum: new Date().toISOString().split('T')[0],
      aangemaakt_door: data.aangemaakt_door,
    })
    .select()
    .single()
  if (factuurError) throw factuurError

  const { error: linkError } = await supabase
    .from('leveringen')
    .update({ factuur_id: factuur.id })
    .in('id', data.levering_ids)
  if (linkError) throw linkError

  return factuur
}

export async function updateFactuurStatus(id: string, status: Factuur['status']): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('facturen').update({ status }).eq('id', id)
  if (error) throw error
}

export async function getLeveringenVoorVrachtFactuur(
  factuurId: string
): Promise<(Levering & { order: Order & { facturatie_code: { tarief: number } } })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leveringen')
    .select('*, order:orders(order_nummer, order_code, omschrijving, bewerking, facturatie_code:facturatie_codes(code, omschrijving, tarief))')
    .eq('factuur_id', factuurId)
    .order('leverdatum')
  if (error) throw error
  return data as (Levering & { order: Order & { facturatie_code: { code: string; omschrijving: string; tarief: number } } })[]
}

// Note: the factuur insert and leveringen update are not wrapped in a transaction.
// If the update fails, an orphan factuur row will exist. This matches the pattern
// in createFactuur above and should be addressed with a Supabase RPC in the future.
export async function createVrachtFactuur(vrachtId: string): Promise<Factuur> {
  const supabase = await createClient()

  // Load all vracht regels with leveringen + order tarifeven
  const { data: regels, error: regelsError } = await supabase
    .from('vracht_regels')
    .select('levering_id, levering:leveringen(id, aantal_geleverd, order:orders(facturatie_code:facturatie_codes(tarief)))')
    .eq('vracht_id', vrachtId)
  if (regelsError) throw regelsError

  const totaalEenheden = regels.reduce((sum: number, r: any) => sum + (r.levering?.aantal_geleverd ?? 0), 0)
  const totaalBedrag = regels.reduce((sum: number, r: any) => {
    const tarief = r.levering?.order?.facturatie_code?.tarief ?? 0
    return sum + tarief * (r.levering?.aantal_geleverd ?? 0)
  }, 0)

  const { data: factuurNummer, error: seqError } = await supabase.rpc('generate_factuur_nummer')
  if (seqError) throw seqError

  const { data: factuur, error: factuurError } = await supabase
    .from('facturen')
    .insert({
      factuur_nummer: factuurNummer,
      vracht_id: vrachtId,
      order_id: null,
      totaal_eenheden: totaalEenheden,
      tarief: null,
      totaal_bedrag: Number(totaalBedrag.toFixed(2)),
      factuurdatum: new Date().toISOString().split('T')[0],
      aangemaakt_door: null,
    })
    .select()
    .single()
  if (factuurError) throw factuurError

  // Link all leveringen to this factuur
  const leveringIds = regels.map((r: any) => r.levering_id)
  const { error: linkError } = await supabase
    .from('leveringen')
    .update({ factuur_id: factuur.id })
    .in('id', leveringIds)
  if (linkError) throw linkError

  return factuur as Factuur
}
