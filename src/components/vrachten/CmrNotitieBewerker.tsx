'use client'

import { useState } from 'react'
import { updateCmrNotitie } from '@/lib/actions/vracht-regels'

interface Props {
  regelId: string
  vrachtId: string
  gegenereerd: string   // wat het systeem berekend heeft
  opgeslagen: string | null  // eventueel eerder opgeslagen override
}

export function CmrNotitieBewerker({ regelId, vrachtId, gegenereerd, opgeslagen }: Props) {
  const [bewerken, setBewerken] = useState(false)
  const huidig = opgeslagen ?? gegenereerd
  const isAangepast = !!opgeslagen && opgeslagen !== gegenereerd

  if (!bewerken) {
    return (
      <div>
        <p className="text-xs text-gray-500 font-mono whitespace-pre-wrap mb-1">{huidig}</p>
        <button
          type="button"
          onClick={() => setBewerken(true)}
          className={`text-xs px-2 py-0.5 rounded border ${isAangepast ? 'border-amber-300 text-amber-600 hover:bg-amber-50' : 'border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
        >
          {isAangepast ? 'Aangepast — bewerken' : 'Bewerken'}
        </button>
      </div>
    )
  }

  return (
    <form action={updateCmrNotitie} onSubmit={() => setBewerken(false)}>
      <input type="hidden" name="regel_id" value={regelId} />
      <input type="hidden" name="vracht_id" value={vrachtId} />
      <textarea
        name="cmr_notitie"
        defaultValue={huidig}
        rows={3}
        className="form-textarea text-xs font-mono w-full mb-2"
        autoFocus
      />
      <div className="flex gap-2">
        <button type="submit" className="text-xs btn-primary px-3 py-1">Opslaan</button>
        <button type="button" onClick={() => setBewerken(false)} className="text-xs text-gray-400 hover:text-gray-600">Annuleren</button>
        {isAangepast && (
          <form action={updateCmrNotitie} className="inline">
            <input type="hidden" name="regel_id" value={regelId} />
            <input type="hidden" name="vracht_id" value={vrachtId} />
            <input type="hidden" name="cmr_notitie" value="" />
            <button type="submit" className="text-xs text-red-400 hover:text-red-600">Herstel origineel</button>
          </form>
        )}
      </div>
    </form>
  )
}
