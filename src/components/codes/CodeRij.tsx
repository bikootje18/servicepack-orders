'use client'

import { useState } from 'react'
import { updateCodeAction, toggleCodeActiefAction } from '@/lib/actions/codes'
import { VerwijderCodeKnop } from './VerwijderCodeKnop'
import { formatCurrency } from '@/lib/utils/formatters'
import type { FacturatieCode } from '@/types'

export function CodeRij({ code }: { code: FacturatieCode }) {
  const [bewerken, setBewerken] = useState(false)

  if (bewerken) {
    return (
      <tr className="border-b border-gray-100">
        <td className="py-2 font-mono text-xs align-top">{code.code}</td>
        <td className="py-2" colSpan={5}>
          <form
            action={async (formData) => {
              await updateCodeAction(formData)
              setBewerken(false)
            }}
            className="flex gap-2 items-center"
          >
            <input type="hidden" name="id" value={code.id} />
            <input
              name="omschrijving"
              defaultValue={code.omschrijving}
              required
              className="form-input flex-1"
            />
            <input
              name="tarief"
              type="number"
              step="0.0001"
              min="0.0001"
              defaultValue={code.tarief}
              required
              className="form-input w-28"
            />
            <input
              name="eenheid"
              defaultValue={code.eenheid}
              placeholder="per stuk"
              className="form-input w-36"
            />
            <button type="submit" className="btn-primary">
              Opslaan
            </button>
            <button
              type="button"
              onClick={() => setBewerken(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Annuleren
            </button>
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`border-b border-gray-100 ${!code.actief ? 'opacity-50' : ''}`}>
      <td className="py-2 font-mono text-xs">{code.code}</td>
      <td className="py-2">{code.omschrijving}</td>
      <td className="py-2 text-right">{formatCurrency(code.tarief)}</td>
      <td className="py-2 pl-3 text-gray-500">{code.eenheid}</td>
      <td className="py-2 text-center">
        <form action={toggleCodeActiefAction} className="inline">
          <input type="hidden" name="id" value={code.id} />
          <input type="hidden" name="actief" value={(!code.actief).toString()} />
          <button
            type="submit"
            title={code.actief ? 'Op inactief zetten' : 'Op actief zetten'}
            className="hover:opacity-70"
          >
            {code.actief ? '✓' : '✗'}
          </button>
        </form>
      </td>
      <td className="py-2 text-right">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setBewerken(true)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Bewerken
          </button>
          <VerwijderCodeKnop id={code.id} code={code.code} />
        </div>
      </td>
    </tr>
  )
}
