'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateCmrNotitie(formData: FormData): Promise<void> {
  const regelId  = formData.get('regel_id') as string
  const vrachtId = formData.get('vracht_id') as string
  const notitie  = (formData.get('cmr_notitie') as string).trim() || null

  const supabase = await createClient()
  const { error } = await supabase
    .from('vracht_regels')
    .update({ cmr_notitie: notitie })
    .eq('id', regelId)
  if (error) throw error

  revalidatePath(`/vrachten/${vrachtId}`)
}
