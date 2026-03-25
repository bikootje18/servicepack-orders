import { createClient } from '@/lib/supabase/server'
import type { GiveXImport } from '@/types'

export async function getGiveXImports(klantId: string): Promise<GiveXImport[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('give_x_imports')
    .select('*, order:orders(id, order_nummer, order_code)')
    .eq('klant_id', klantId)
    .order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data as GiveXImport[]
}

export async function saveGiveXImport(data: {
  klant_id: string
  documentnummer: string
  instructie_code: string
  leverdatum: string | null
  totaal_hoeveelheid: number
  totaal_rollen: number | null
  heeft_rollen: boolean
  order_id: string | null
}): Promise<GiveXImport> {
  const supabase = await createClient()
  const { data: record, error } = await supabase
    .from('give_x_imports')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return record as GiveXImport
}
