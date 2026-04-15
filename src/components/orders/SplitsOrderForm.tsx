'use client'

import { useState } from 'react'
import { splitsOrderAction } from '@/lib/actions/orders'
import { LOCATIES } from '@/lib/constants/locaties'

interface Props {
  orderId: string
  resterend: number
  huidigeLocatie: string | null
}

export function SplitsOrderForm({ orderId, resterend, huidigeLocatie }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-gray-400 hover:text-violet-600 hover:underline"
      >
        Splits order
      </button>
    )
  }

  const andereLocaties = LOCATIES.filter(l => l.waarde !== huidigeLocatie)

  return (
    <form
      action={splitsOrderAction.bind(null, orderId)}
      className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
    >
      <div>
        <label className="block text-xs text-gray-500 mb-1">Aantal afsplitsen</label>
        <input
          type="number"
          name="aantal"
          min={1}
          max={resterend}
          required
          className="form-input w-28 text-sm"
          placeholder={`max ${resterend}`}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Naar locatie</label>
        <select name="locatie" required className="form-input text-sm">
          <option value="">Kies locatie…</option>
          {andereLocaties.map(l => (
            <option key={l.waarde} value={l.waarde}>{l.label}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="text-sm bg-violet-600 text-white px-3 py-1.5 rounded-md hover:bg-violet-700 font-medium"
      >
        Splits
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-gray-400 hover:text-gray-700"
      >
        Annuleren
      </button>
    </form>
  )
}
