'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createVracht } from '@/lib/db/vrachten'
import { createVrachtFactuur as dbCreateFactuur } from '@/lib/db/facturen'

export async function createVrachtAction(formData: FormData): Promise<void> {
  const klant_id = formData.get('klant_id') as string
  const datum = formData.get('datum') as string
  const notities = (formData.get('notities') as string) ?? ''
  const levering_ids = formData.getAll('levering_ids') as string[]

  if (!klant_id || !datum || levering_ids.length === 0) return

  const vracht = await createVracht({ klant_id, datum, notities, levering_ids })
  // Factuur wordt altijd direct aangemaakt bij het aanmaken van een vracht
  await dbCreateFactuur(vracht.id)
  redirect(`/vrachten/${vracht.id}/klaar`)
}

export async function markeerVrachtOpgehaald(id: string): Promise<void> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { error } = await supabase.from('vrachten').update({ status: 'opgehaald' }).eq('id', id)
  if (error) throw error
  revalidatePath('/vrachten')
}

export async function createVrachtFactuurAction(vrachtId: string): Promise<void> {
  const factuur = await dbCreateFactuur(vrachtId)
  revalidatePath(`/vrachten/${vrachtId}`)
  redirect(`/facturen/${factuur.id}`)
}
