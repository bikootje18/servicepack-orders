import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { uitloggen } from '@/lib/actions/auth'

export default async function LocatieLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon-preview.png" alt="Service Pack" className="h-10 w-auto object-contain" />
        <form action={uitloggen}>
          <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Uitloggen
          </button>
        </form>
      </header>
      <main className="p-6 max-w-4xl mx-auto">
        {children}
      </main>
    </div>
  )
}
