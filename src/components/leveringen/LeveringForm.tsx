'use client'

import { useState } from 'react'
import { createLevering } from '@/lib/actions/leveringen'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  orderGrootte: number
  totaalGeleverd: number
}

export function LeveringForm({ orderId, orderGrootte, totaalGeleverd }: Props) {
  const router = useRouter()
  const resterend = orderGrootte - totaalGeleverd
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  if (resterend === 0) {
    return <p className="text-sm text-green-600 mb-4">Volledig geleverd.</p>
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLaden(true)
    setFout(null)
    const formData = new FormData(e.currentTarget)
    const aantal = parseInt(formData.get('aantal_geleverd') as string)

    if (aantal > resterend) {
      setFout(`Maximaal ${resterend} eenheden resterend`)
      setLaden(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await createLevering({
      order_id: orderId,
      aantal_geleverd: aantal,
      leverdatum: formData.get('leverdatum') as string,
      notities: formData.get('notities') as string || '',
      aangemaakt_door: user?.id ?? null,
    })

    router.refresh()
    setLaden(false)
    ;(e.target as HTMLFormElement).reset()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <p className="text-sm text-gray-500 mb-3">Resterend: <strong>{resterend.toLocaleString('nl-NL')}</strong> eenheden</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Aantal geleverd *</label>
          <input name="aantal_geleverd" type="number" min="1" max={resterend} required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Leverdatum *</label>
          <input name="leverdatum" type="date" required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notities</label>
          <input name="notities"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
      </div>
      {fout && <p className="text-sm text-red-600 mt-2">{fout}</p>}
      <button type="submit" disabled={laden}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {laden ? 'Opslaan...' : 'Levering toevoegen'}
      </button>
    </form>
  )
}
