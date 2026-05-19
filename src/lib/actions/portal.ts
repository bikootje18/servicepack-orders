'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function uitnodigingVersturen(klantId: string, email: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'klant' },
  })
  if (error) throw new Error(error.message)

  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('klanten')
    .update({ portal_user_id: data.user.id })
    .eq('id', klantId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath(`/klanten/${klantId}`)
}

export async function toegangIntrekken(klantId: string, portalUserId: string): Promise<void> {
  const admin = createAdminClient()
  const { error: deleteError } = await admin.auth.admin.deleteUser(portalUserId)
  if (deleteError) throw new Error(deleteError.message)

  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('klanten')
    .update({ portal_user_id: null })
    .eq('id', klantId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath(`/klanten/${klantId}`)
}

export async function portalUitloggen(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/portal/login')
}
