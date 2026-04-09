'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Klant } from '@/types'

export function KlantKiezer({ klanten }: { klanten: Klant[] }) {
  const [zoek, setZoek] = useState('')

  const gefilterd = zoek.trim()
    ? klanten.filter(k => k.naam.toLowerCase().includes(zoek.toLowerCase()))
    : klanten

  return (
    <div>
      <input
        type="text"
        placeholder="Zoek op klantnaam..."
        value={zoek}
        onChange={e => setZoek(e.target.value)}
        className="form-input mb-3"
        autoFocus
      />
      {gefilterd.length === 0 ? (
        <p className="text-sm text-gray-400 py-3 text-center">Geen klanten gevonden.</p>
      ) : (
        <div className="space-y-2">
          {gefilterd.map(k => (
            <Link
              key={k.id}
              href={`/vrachten/nieuw?klant_id=${k.id}`}
              className="block border border-gray-200 rounded px-4 py-3 hover:bg-gray-50 text-sm font-medium"
            >
              {k.naam}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
