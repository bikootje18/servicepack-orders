'use client'

import { useState, useRef } from 'react'
import { createLevering, gereedmeldenEnVrachtAanmaken } from '@/lib/actions/leveringen'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  klantId: string
  orderGrootte: number
  totaalGeleverd: number
}

export function LeveringForm({ orderId, klantId, orderGrootte, totaalGeleverd }: Props) {
  const router = useRouter()
  const resterend = orderGrootte - totaalGeleverd
  const [laden, setLaden] = useState(false)
  const [snelLaden, setSnelLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  if (resterend === 0) {
    return <p className="text-sm text-green-600 mb-4">Volledig gereedgemeld.</p>
  }

  function leesFormulier(): { aantal: number; leverdatum: string; notities: string; tht: string | null } | null {
    const form = formRef.current
    if (!form) return null
    const formData = new FormData(form)
    const aantal = parseInt(formData.get('aantal_geleverd') as string)
    const leverdatum = formData.get('leverdatum') as string
    const notities = (formData.get('notities') as string) || ''
    const tht = (formData.get('tht') as string) || null
    return { aantal, leverdatum, notities, tht }
  }

  async function handleOpslaan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const waarden = leesFormulier()
    if (!waarden) return
    const { aantal, leverdatum, notities, tht } = waarden

    if (aantal > resterend) {
      setFout(`Maximaal ${resterend} eenheden resterend`)
      return
    }

    setLaden(true)
    setFout(null)
    await createLevering({
      order_id: orderId,
      aantal_geleverd: aantal,
      leverdatum,
      notities,
      tht,
      aangemaakt_door: null,
    })
    router.refresh()
    setLaden(false)
    formRef.current?.reset()
  }

  async function handleSnelVracht(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    const waarden = leesFormulier()
    if (!waarden) return
    const { aantal, leverdatum, notities, tht } = waarden

    if (!aantal || aantal <= 0) {
      setFout('Vul het aantal in')
      return
    }
    if (aantal > resterend) {
      setFout(`Maximaal ${resterend} eenheden resterend`)
      return
    }
    if (!leverdatum) {
      setFout('Vul de datum in')
      return
    }

    setSnelLaden(true)
    setFout(null)
    await gereedmeldenEnVrachtAanmaken({
      order_id: orderId,
      klant_id: klantId,
      aantal_geleverd: aantal,
      leverdatum,
      notities,
      tht,
    })
  }

  return (
    <form ref={formRef} onSubmit={handleOpslaan} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <p className="text-sm text-gray-500 mb-3">Resterend: <strong>{resterend.toLocaleString('nl-NL')}</strong> eenheden</p>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Aantal gereed *</label>
          <input name="aantal_geleverd" type="number" min="1" max={resterend} required
            className="form-input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Datum *</label>
          <input name="leverdatum" type="date" required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="form-input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notities</label>
          <input name="notities" className="form-input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">THT (afwijkend)</label>
          <input name="tht" type="date" className="form-input" />
        </div>
      </div>
      {fout && <p className="text-sm text-red-600 mt-2">{fout}</p>}
      <div className="flex gap-2 mt-3">
        <button type="submit" disabled={laden || snelLaden} className="btn-primary">
          {laden ? 'Opslaan...' : 'Gereedmelding opslaan'}
        </button>
        <button
          type="button"
          onClick={handleSnelVracht}
          disabled={laden || snelLaden}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {snelLaden ? 'Bezig...' : 'Gereedmelden & Vracht aanmaken'}
        </button>
      </div>
    </form>
  )
}
