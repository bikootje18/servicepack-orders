// src/components/orders/ArtikelenForm.tsx
'use client'
import { useState, useEffect } from 'react'
import { berekenAantal } from '@/lib/utils/artikel-berekening'
import type { OrderArtikel } from '@/types'

interface ArtikelRij {
  naam: string
  berekening_type: 'delen' | 'vermenigvuldigen'
  factor: string
}

interface Props {
  initialArtikelen: Pick<OrderArtikel, 'naam' | 'berekening_type' | 'factor'>[]
  defaultOrderGrootte: number | null
  lookupArtikelen?: Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }>
}

export function ArtikelenForm({ initialArtikelen, defaultOrderGrootte, lookupArtikelen }: Props) {
  const [open, setOpen] = useState(initialArtikelen.length > 0)
  const [regels, setRegels] = useState<ArtikelRij[]>(
    initialArtikelen.map(a => ({
      naam: a.naam,
      berekening_type: a.berekening_type,
      factor: String(a.factor),
    }))
  )
  const [orderGrootte, setOrderGrootte] = useState<number | null>(defaultOrderGrootte)

  useEffect(() => {
    if (!lookupArtikelen || lookupArtikelen.length === 0) return
    setRegels(lookupArtikelen.map(a => ({
      naam: a.naam,
      berekening_type: a.berekening_type,
      factor: String(a.factor),
    })))
    setOpen(true)
  }, [lookupArtikelen])

  // Luister naar wijzigingen in het order_grootte invoerveld in de parent form
  useEffect(() => {
    const input = document.querySelector('input[name="order_grootte"]') as HTMLInputElement | null
    if (!input) return
    const handler = () => {
      const val = parseInt(input.value)
      setOrderGrootte(isNaN(val) ? null : val)
    }
    input.addEventListener('input', handler)
    return () => input.removeEventListener('input', handler)
  }, [])

  function voegToe() {
    setRegels(prev => [...prev, { naam: '', berekening_type: 'delen', factor: '' }])
  }

  function verwijder(i: number) {
    setRegels(prev => prev.filter((_, idx) => idx !== i))
  }

  function update(i: number, veld: keyof ArtikelRij, waarde: string) {
    setRegels(prev => prev.map((r, idx) => idx === i ? { ...r, [veld]: waarde } : r))
  }

  function toonAantal(r: ArtikelRij): string {
    const factor = parseFloat(r.factor)
    if (isNaN(factor)) return '—'
    const result = berekenAantal(orderGrootte, r.berekening_type, factor)
    return result == null ? '—' : String(result)
  }

  return (
    <div>
      {/* Hidden inputs voor form submission */}
      <input type="hidden" name="artikelen_geopend" value={open ? 'true' : 'false'} />
      {open && (
        <>
          <input type="hidden" name="artikelen_count" value={String(regels.length)} />
          {regels.map((r, i) => (
            <span key={i}>
              <input type="hidden" name={`artikel_naam_${i}`} value={r.naam} />
              <input type="hidden" name={`artikel_type_${i}`} value={r.berekening_type} />
              <input type="hidden" name={`artikel_factor_${i}`} value={r.factor} />
            </span>
          ))}
        </>
      )}

      {/* Header met toggle */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Artikelen</span>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {open ? 'Verbergen' : (regels.length > 0 ? `${regels.length} artikel(en)` : 'Toevoegen')}
        </button>
      </div>

      {open && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {regels.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Naam</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Factor</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Aantal</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {regels.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={r.naam}
                        onChange={e => update(i, 'naam', e.target.value)}
                        className="form-input text-sm"
                        placeholder="bijv. ser8030"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={r.berekening_type}
                        onChange={e => update(i, 'berekening_type', e.target.value)}
                        className="form-select text-sm"
                      >
                        <option value="delen">Delen</option>
                        <option value="vermenigvuldigen">Vermenigvuldigen</option>
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        value={r.factor}
                        onChange={e => update(i, 'factor', e.target.value)}
                        className="form-input text-sm w-24"
                        placeholder="bijv. 50"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 font-medium">
                      {toonAantal(r)}
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => verwijder(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                        aria-label="Verwijder"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-3 py-2 border-t border-gray-100">
            <button
              type="button"
              onClick={voegToe}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Artikel toevoegen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
