import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavLink } from '@/components/ui/NavLink'

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/vrachten', label: 'Vrachten' },
  { href: '/voorraad', label: 'Voorraad' },
]

const beheer = [
  { href: '/klanten', label: 'Klanten' },
  { href: '/codes', label: 'Codes' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-52 bg-[#111827] flex flex-col flex-shrink-0 fixed h-screen z-10">

        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon-preview.png"
            alt="Service Pack b.v."
            className="h-10 w-auto object-contain"
          />
        </div>

        {/* Nav — operationeel */}
        <nav className="px-2.5 pt-4 pb-2">
          <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">
            Operationeel
          </p>
          <div className="space-y-0.5">
            {nav.map(item => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </div>
        </nav>

        {/* Nav — beheer */}
        <nav className="px-2.5 pt-3 pb-2">
          <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25">
            Beheer
          </p>
          <div className="space-y-0.5">
            {beheer.map(item => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </div>
        </nav>

        {/* User */}
        <div className="mt-auto px-5 py-4 border-t border-white/8">
          <p className="text-white/30 text-[11px] truncate">{user.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-52 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
