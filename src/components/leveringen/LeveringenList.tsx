'use client'

import { useState } from 'react'
import type { Levering } from '@/types'
import { formatDate, formatAantal } from '@/lib/utils/formatters'
import { deleteLevering, updateLevering } from '@/lib/actions/leveringen'

export function LeveringenList({ leveringen, orderId }: { leveringen: Levering[], orderId: string }) {
  const [bewerkId, setBewerkId] = useState<string | null>(null)

  if (leveringen.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-xl">
        Nog geen gereedmeldingen geregistreerd.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">#</th>
            <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">Datum</th>
            <th className="text-right px-5 py-3 font-semibold text-xs text-gray-500">Aantal</th>
            <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">THT</th>
            <th className="text-right px-5 py-3 font-semibold text-xs text-gray-500">Uren</th>
            <th className="text-left px-5 py-3 font-semibold text-xs text-gray-500">Notities</th>
            <th className="text-center px-5 py-3 font-semibold text-xs text-gray-500">Factuur</th>
            <th className="print:hidden"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {leveringen.map((l, i) => {
            const inFactuur = !!l.factuur_id
            if (bewerkId === l.id) {
              return (
                <tr key={l.id} className="bg-blue-50">
                  <td className="px-5 py-3" colSpan={7}>
                    <form action={updateLevering}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="order_id" value={orderId} />
                      <div className="flex items-center gap-3 flex-wrap">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Datum</p>
                          <input type="date" name="leverdatum" defaultValue={l.leverdatum}
                            className="form-input w-36 text-sm" required />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Aantal</p>
                          <input type="number" name="aantal_geleverd" defaultValue={l.aantal_geleverd}
                            className="form-input w-24 text-sm" min={0} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">THT</p>
                          <input type="date" name="tht" defaultValue={l.tht ?? ''}
                            className="form-input w-36 text-sm" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Uren</p>
                          <input type="number" name="uren" defaultValue={l.uren ?? ''}
                            min={0.25} step={0.25} placeholder="–"
                            className="form-input w-20 text-sm" />
                        </div>
                        <div className="flex-1 min-w-[160px]">
                          <p className="text-xs text-gray-500 mb-0.5">Notities</p>
                          <input type="text" name="notities" defaultValue={l.notities ?? ''}
                            className="form-input w-full text-sm" />
                        </div>
                        <div className="flex gap-2 pt-4">
                          <button type="submit" className="btn-primary text-xs px-3 py-1.5">
                            Opslaan
                          </button>
                          <button type="button" onClick={() => setBewerkId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700">
                            Annuleren
                          </button>
                        </div>
                      </div>
                    </form>
                  </td>
                </tr>
              )
            }
            return (
              <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3.5 text-xs text-gray-400 tabular-nums font-medium">
                  {leveringen.length - i}
                </td>
                <td className="px-5 py-3.5 font-medium text-gray-900 tabular-nums">
                  {formatDate(l.leverdatum)}
                </td>
                <td className="px-5 py-3.5 text-right font-bold tabular-nums text-gray-900">
                  {formatAantal(l.aantal_geleverd)}
                </td>
                <td className="px-5 py-3.5 text-gray-500 text-xs tabular-nums">
                  {l.tht ? formatDate(l.tht) : <span className="text-gray-300">–</span>}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-gray-500 text-sm">
                  {l.uren != null ? `${l.uren}u` : <span className="text-gray-300">–</span>}
                </td>
                <td className="px-5 py-3.5 text-gray-500 max-w-[240px]">
                  <span className="line-clamp-2 print:line-clamp-none">{l.notities || <span className="text-gray-300">–</span>}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {inFactuur ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">✓</span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">–</span>
                  )}
                </td>
                <td className="px-3 py-3.5 text-right print:hidden">
                  <div className="flex items-center gap-2 justify-end">
                    {!inFactuur && (
                      <button
                        type="button"
                        onClick={() => setBewerkId(l.id)}
                        className="text-xs text-gray-400 hover:text-gray-700"
                      >
                        Bewerken
                      </button>
                    )}
                    <form action={deleteLevering} className="inline-flex items-center">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="order_id" value={orderId} />
                      <button type="submit"
                        className="text-xs text-red-400 hover:text-red-600"
                        onClick={(e) => {
                          const bericht = inFactuur
                            ? 'Deze gereedmelding is gekoppeld aan een factuur. De factuur en eventuele vracht worden ook verwijderd. Doorgaan?'
                            : 'Gereedmelding verwijderen?'
                          if (!confirm(bericht)) e.preventDefault()
                        }}
                      >
                        Verwijderen
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
