'use client'
import { useState } from 'react'
import type { Klant } from '@/types'

interface Props {
  klant: Klant
  bewerkAction: (formData: FormData) => Promise<void>
}

function formatAdres(klant: Klant): string {
  return [
    klant.adres,
    klant.postcode && klant.stad
      ? `${klant.postcode} ${klant.stad}`
      : klant.postcode || klant.stad,
    klant.land,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function KlantBewerkFormulier({ klant, bewerkAction }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{klant.naam}</h1>
          {formatAdres(klant) && (
            <p className="text-sm text-gray-500 mt-1">{formatAdres(klant)}</p>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Bewerken
        </button>
      </div>
    )
  }

  return (
    <form
      action={async (formData) => {
        await bewerkAction(formData)
        setOpen(false)
      }}
      className="mb-8 bg-white border border-gray-200 rounded-lg p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-gray-700">Klant bewerken</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
        <input name="naam" defaultValue={klant.naam} required className="form-input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
        <input name="adres" defaultValue={klant.adres ?? ''} className="form-input" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
          <input name="postcode" defaultValue={klant.postcode ?? ''} className="form-input" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
          <input name="stad" defaultValue={klant.stad ?? ''} className="form-input" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
        <input name="land" defaultValue={klant.land ?? ''} className="form-input" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary">Opslaan</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
          Annuleren
        </button>
      </div>
    </form>
  )
}
