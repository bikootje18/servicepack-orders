import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/facturen', label: 'Facturen' },
  { href: '/voorraad', label: 'Voorraad' },
  { href: '/klanten', label: 'Klanten' },
  { href: '/codes', label: 'Codes' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-700 text-lg">OSS</span>
        <nav className="flex gap-4 text-sm">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href} className="text-gray-600 hover:text-gray-900">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
