'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { upsertProfiel } from '@/lib/db/profielen'
import { revalidatePath } from 'next/cache'

async function slaNaamOp(formData: FormData) {
  'use server'
  const id    = formData.get('id') as string
  const email = formData.get('email') as string
  const naam  = (formData.get('naam') as string).trim()
  if (!naam) return
  await upsertProfiel(id, email, naam)
  revalidatePath('/admin/gebruikers')
}

export default async function AdminGebruikersPage() {
  const adminClient = createAdminClient()
  const regularClient = await createClient()

  // Auth users ophalen via service role (admin API)
  const { data: { users }, error } = await adminClient.auth.admin.listUsers()
  if (error) throw error

  // Huidige profielen ophalen
  const { data: profielen } = await regularClient
    .from('profielen')
    .select('id, naam')

  const profielMap = Object.fromEntries((profielen ?? []).map(p => [p.id, p.naam]))

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Gebruikers</h1>
      <div className="space-y-3">
        {users.map(user => (
          <form key={user.id} action={slaNaamOp} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="email" value={user.email ?? ''} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <input
                type="text"
                name="naam"
                defaultValue={profielMap[user.id] ?? ''}
                placeholder="Naam instellen…"
                className="form-input mt-1 text-sm"
              />
            </div>
            <button type="submit" className="btn-primary text-xs px-3 py-1.5 flex-shrink-0">
              Opslaan
            </button>
          </form>
        ))}
      </div>
    </div>
  )
}
