import { createClient } from '@/lib/supabase/server'
import type { Factuur, Levering } from '@/types'

export function berekenFactuurBedrag(tarief: number, totaalEenheden: number): number {
  return Math.round(tarief * totaalEenheden * 100) / 100
}

export async function getFacturen(): Promise<Factuur[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('facturen')
    .select('*, order:orders(id, order_nummer, klant:klanten(naam))')
    .order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data as Factuur[]
}

export async function getFactuur(id: string): Promise<Factuur> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('facturen')
    .select('*, order:orders(*, klant:klanten(naam), facturatie_code:facturatie_codes(code))')
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
