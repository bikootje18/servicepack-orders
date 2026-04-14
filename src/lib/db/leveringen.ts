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

export async function deleteLevering(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('leveringen').delete().eq('id', id)
  if (error) throw error
}

export async function updateLevering(id: string, data: {
  aantal_geleverd: number
  leverdatum: string
  notities: string
  tht?: string | null
  uren?: number | null
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('leveringen').update(data).eq('id', id)
  if (error) throw error
}

export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  tht?: string | null
  uren?: number | null
  aangemaakt_door: string | null
}): Promise<Levering> {
  const supabase = await createClient()
  const { data: levering, error } = await supabase
    .from('leveringen')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return levering as Levering
}

export async function deleteLeveringMetCascade(id: string): Promise<void> {
  const supabase = await createClient()

  // Stap 1: Lees de gereedmelding op voor factuur_id
  const { data: levering, error: leveringError } = await supabase
    .from('leveringen')
    .select('factuur_id')
    .eq('id', id)
    .single()
  if (leveringError) throw leveringError

  // Stap 2: Zoek bijbehorende vracht_regel op
  const { data: regel, error: regelError } = await supabase
    .from('vracht_regels')
    .select('vracht_id')
    .eq('levering_id', id)
    .maybeSingle()
  if (regelError) throw regelError

  if (regel) {
    // Stap 3: Verwijder de vracht_regel
    const { error: deleteRegelError } = await supabase
      .from('vracht_regels')
      .delete()
      .eq('levering_id', id)
    if (deleteRegelError) throw deleteRegelError

    // Stap 4: Check of vracht nu leeg is
    const { data: overig, error: overigError } = await supabase
      .from('vracht_regels')
      .select('vracht_id')
      .eq('vracht_id', regel.vracht_id)
    if (overigError) throw overigError

    if (overig.length === 0) {
      // Vracht is leeg → verwijder de vracht-factuur én de vracht
      const { error: deleteVrachtFactuurError } = await supabase.from('facturen').delete().eq('vracht_id', regel.vracht_id)
      if (deleteVrachtFactuurError) throw deleteVrachtFactuurError
      const { error: deleteVrachtError } = await supabase
        .from('vrachten')
        .delete()
        .eq('id', regel.vracht_id)
      if (deleteVrachtError) throw deleteVrachtError
    }
    // Als vracht nog regels heeft: factuur blijft staan (hoort bij overige gereedmeldingen)
  } else if (levering.factuur_id) {
    // Geen vracht_regel: gereedmelding heeft een order-factuur → verwijder die
    const { error: deleteFactuurError } = await supabase
      .from('facturen')
      .delete()
      .eq('id', levering.factuur_id)
    if (deleteFactuurError) throw deleteFactuurError
  }

  // Stap 5: Verwijder de gereedmelding
  const { error: deleteLeveringError } = await supabase
    .from('leveringen')
    .delete()
    .eq('id', id)
  if (deleteLeveringError) throw deleteLeveringError
}
