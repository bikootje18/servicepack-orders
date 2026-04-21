import { createClient } from '@/lib/supabase/server'
import type { Productdefinitie } from '@/types'

export async function zoekProductdefinities(zoekterm: string): Promise<Productdefinitie[]> {
  if (!zoekterm || zoekterm.trim().length < 2) return []

  const supabase = await createClient()
  const term = zoekterm.trim()

  const { data, error } = await supabase
    .from('productdefinities')
    .select('*')
    .eq('publiceren', true)
    .or(`art_nr.ilike.%${term}%,omschrijving_eindproduct.ilike.%${term}%`)
    .order('art_nr')
    .limit(8)

  if (error) throw new Error(`[zoekProductdefinities] ${error.message}`)
  return (data ?? []) as Productdefinitie[]
}
