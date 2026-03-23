import { createClient } from '@/lib/supabase/server'
import type { Klant } from '@/types'

export function validateKlant(data: { naam: string }): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.naam.trim()) errors.naam = 'Naam is verplicht'
  return errors
}

export function buildKlantQuery(naam: string) {
  return { naam: naam.trim() }
}

export async function getKlanten(): Promise<Klant[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('klanten')
    .select('*')
    .order('naam')
  if (error) throw error
  return data
}

export async function createKlant(naam: string): Promise<Klant> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('klanten')
    .insert({ naam: naam.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateKlant(id: string, naam: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('klanten')
    .update({ naam: naam.trim() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteKlant(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('klanten').delete().eq('id', id)
  if (error) throw error
}
