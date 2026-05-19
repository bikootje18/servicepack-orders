import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPortalOrders } from '@/lib/db/portal'
import { portalUitloggen } from '@/lib/actions/portal'
import { PortalOrderLijst } from '@/components/portal/PortalOrderLijst'

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal/login')

  const { data: klant } = await supabase
    .from('klanten')
    .select('id, naam')
    .eq('portal_user_id', user.id)
    .single()

  if (!klant) redirect('/portal/login')

  const orders = await getPortalOrders(klant.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon-preview.png" alt="Service Pack b.v." className="h-10 w-auto object-contain" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium">{klant.naam}</span>
          <form action={portalUitloggen}>
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
              Uitloggen
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Uw orders ({orders.length})
        </h1>
        <PortalOrderLijst orders={orders} />
      </main>
    </div>
  )
}
