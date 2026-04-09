import { createClient } from '@/lib/supabase/server'
import type { Klant } from '@/types'

interface KlantData {
  naam: string
  adres?: string
  postcode?: string
  stad?: string
  land?: string
  email?: string | null
}

export function validateKlant(data: { naam: string }): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.naam.trim()) errors.naam = 'Naam is verplicht'
  return errors
}

export function buildKlantQuery(data: KlantData) {
  return {
    naam: data.naam.trim(),
    adres: data.adres?.trim() ?? '',
    postcode: data.postcode?.trim() ?? '',
    stad: data.stad?.trim() ?? '',
    land: data.land?.trim() ?? '',
    email: data.email?.trim() || null,
  }
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

export async function getKlant(id: string): Promise<Klant> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('klanten')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createKlant(data: KlantData): Promise<Klant> {
  const supabase = await createClient()
  const { data: klant, error } = await supabase
    .from('klanten')
    .insert(buildKlantQuery(data))
    .select()
    .single()
  if (error) throw error
  return klant
}

export async function updateKlant(id: string, data: KlantData): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('klanten')
    .update(buildKlantQuery(data))
    .eq('id', id)
  if (error) throw error
}

export async function deleteKlant(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('klanten').delete().eq('id', id)
  if (error) throw error
}
