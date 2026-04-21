'use client'

import { useState, useEffect, useRef } from 'react'
import { zoekProductdefAction } from '@/lib/actions/productdefinities'
import type { Productdefinitie, PalletType } from '@/types'

const LADING_DRAGER_MAP: Record<string, PalletType> = {
  CHEP100: 'chep',
  CHEP80: 'chep',
  EURO: 'euro',
  DPB: 'geen',
  DOLLY: 'geen',
}

export interface ProductLookupResult {
  order_code: string
  omschrijving: string
  aantal_per_pallet: number
  pallet_type: PalletType
  artikelen: Array<{
    naam: string
    berekening_type: 'delen' | 'vermenigvuldigen'
    factor: number
  }>
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (result: ProductLookupResult) => void
}

export function ProductLookup({ value, onChange, onSelect }: Props) {
  const [resultaten, setResultaten] = useState<Productdefinitie[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (value.trim().length < 2) {
      setResultaten([])
      setOpen(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const data = await zoekProductdefAction(value.trim())
      setResultaten(data)
      setOpen(data.length > 0)
      setLoading(false)
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value])

  // Sluit dropdown bij klik buiten
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selecteer(pd: Productdefinitie) {
    const artikelen: ProductLookupResult['artikelen'] = []

    if (pd.tray_1_code && pd.tray_1_per_he > 0) {
      artikelen.push({
        naam: `BSB${pd.tray_1_code} ${pd.tray_1_omschrijving}`.trim(),
        berekening_type: 'vermenigvuldigen',
        factor: pd.tray_1_per_he,
      })
    }
    if (pd.tray_2_code && pd.tray_2_per_he > 0) {
      artikelen.push({
        naam: `BSB${pd.tray_2_code} ${pd.tray_2_omschrijving}`.trim(),
        berekening_type: 'vermenigvuldigen',
        factor: pd.tray_2_per_he,
      })
    }

    const omschrijvingParts = [
      `${pd.art_nr} ${pd.omschrijving_eindproduct}`,
    ]
    if (pd.per_laag && pd.lagen) {
      omschrijvingParts.push(`Per ${pd.per_laag}x${pd.lagen} = ${pd.per_pallet}`)
    }
    if (pd.ean_he) {
      omschrijvingParts.push(`EAN = ${pd.ean_he}`)
    }

    onSelect({
      order_code: pd.art_nr,
      omschrijving: omschrijvingParts.join('\n'),
      aantal_per_pallet: pd.per_pallet,
      pallet_type: LADING_DRAGER_MAP[pd.lading_drager] ?? 'geen',
      artikelen,
    })

    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Order code *</label>
      <input
        name="order_code"
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (resultaten.length > 0) setOpen(true) }}
        className="form-input"
        placeholder="Typ artikelcode of naam..."
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-[2.1rem] text-xs text-gray-400">Zoeken...</div>
      )}

      {open && resultaten.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {resultaten.map(pd => (
            <button
              key={pd.id}
              type="button"
              onClick={() => selecteer(pd)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
            >
              <span className="font-mono text-xs font-bold text-gray-900 w-16 flex-shrink-0">
                {pd.art_nr}
              </span>
              <span className="text-sm text-gray-600 truncate">
                {pd.omschrijving_eindproduct}
              </span>
              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                {pd.per_pallet}/pallet
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
