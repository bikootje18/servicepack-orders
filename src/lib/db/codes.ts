import { createClient } from '@/lib/supabase/server'
import type { FacturatieCode } from '@/types'

export function validateCode(data: { code: string; omschrijving: string; tarief: number }): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.code.trim()) errors.code = 'Code is verplicht'
  if (!data.omschrijving.trim()) errors.omschrijving = 'Omschrijving is verplicht'
  if (data.tarief <= 0) errors.tarief = 'Tarief moet groter zijn dan 0'
  return errors
}

export async function getCodes(inclusiefInactief = false): Promise<FacturatieCode[]> {
  const supabase = await createClient()
  let query = supabase.from('facturatie_codes').select('*').order('code')
  if (!inclusiefInactief) query = query.eq('actief', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createCode(data: { code: string; omschrijving: string; tarief: number }): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('facturatie_codes').insert(data)
  if (error) throw error
}

export async function updateCode(id: string, data: { omschrijving?: string; tarief?: number }): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('facturatie_codes').update(data).eq('id', id)
  if (error) throw error
}

export async function toggleCodeActief(id: string, actief: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('facturatie_codes').update({ actief }).eq('id', id)
  if (error) throw error
}
