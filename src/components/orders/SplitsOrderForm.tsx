'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { splitsOrderAction } from '@/lib/actions/orders'
import { LOCATIES } from '@/lib/constants/locaties'

interface Props {
  orderId: string
  resterend: number
  huidigeLocatie: string | null
}

export function SplitsOrderForm({ orderId, resterend, huidigeLocatie }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-gray-400 hover:text-violet-600 hover:underline"
      >
        + Splits order
      </button>
    )
  }

  const andereLocaties = LOCATIES.filter(l => l.waarde !== huidigeLocatie)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await splitsOrderAction(orderId, formData)
      if (result) router.push(`/orders/${result.nieuwId}`)
    })
  }

  return (
    <div className="mt-3 border border-violet-200 bg-violet-50/50 rounded-xl p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-3">Order splitsen</p>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Aantal afsplitsen <span className="text-gray-400">(max {(resterend - 1).toLocaleString('nl-NL')})</span>
            </label>
            <input
              type="number"
              name="aantal"
              min={1}
              max={resterend - 1}
              required
              className="form-input w-full text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Naar locatie</label>
            <select name="locatie" required className="form-input w-full text-sm">
              <option value="">Kies locatie…</option>
              {andereLocaties.map(l => (
                <option key={l.waarde} value={l.waarde}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary"
          >
            {isPending ? 'Bezig…' : 'Splits'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm text-gray-400 hover:text-gray-700"
          >
            Annuleren
          </button>
        </div>
      </form>
    </div>
  )
}
