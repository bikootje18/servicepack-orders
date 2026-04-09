import { createClient } from '@/lib/supabase/server'

export async function getProfiel(userId: string): Promise<{ naam: string; email: string } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profielen')
    .select('naam, email')
    .eq('id', userId)
    .single()
  return data ?? null
}

export async function upsertProfiel(userId: string, email: string, naam: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profielen')
    .upsert({ id: userId, email, naam }, { onConflict: 'id' })
  if (error) throw error
}
