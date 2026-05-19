'use client'

import { useState } from 'react'
import { uitnodigingVersturen, toegangIntrekken } from '@/lib/actions/portal'

interface Props {
  klantId: string
  klantEmail: string | null
  portalUserId: string | null
}

export function PortalToegang({ klantId, klantEmail, portalUserId }: Props) {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  async function handleUitnodiging() {
    if (!klantEmail) return
    setBezig(true)
    setFout(null)
    try {
      await uitnodigingVersturen(klantId, klantEmail)
    } catch {
      setFout('Er ging iets mis. Controleer of het e-mailadres correct is ingesteld.')
    } finally {
      setBezig(false)
    }
  }

  async function handleIntrekken() {
    if (!portalUserId) return
    setBezig(true)
    setFout(null)
    try {
      await toegangIntrekken(klantId, portalUserId)
    } catch {
      setFout('Er ging iets mis bij het intrekken van de toegang.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div>
      {portalUserId ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Portaaltoegang actief
          </span>
          <button
            type="button"
            onClick={handleIntrekken}
            disabled={bezig}
            className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {bezig ? 'Bezig...' : 'Toegang intrekken'}
          </button>
        </div>
      ) : klantEmail ? (
        <button
          type="button"
          onClick={handleUitnodiging}
          disabled={bezig}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {bezig ? 'Versturen...' : 'Stuur uitnodiging'}
        </button>
      ) : (
        <p className="text-sm text-gray-400">
          Geen e-mailadres ingesteld — voeg eerst een e-mailadres toe aan deze klant.
        </p>
      )}
      {fout && <p className="mt-2 text-xs text-red-600">{fout}</p>}
    </div>
  )
}
