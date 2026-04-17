'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  klanten: { id: string; naam: string }[]
  geselecteerdeKlantId?: string
}

export function KlantCombobox({ klanten, geselecteerdeKlantId }: Props) {
  const router = useRouter()
  const geselecteerdeNaam = klanten.find(k => k.id === geselecteerdeKlantId)?.naam ?? ''

  const [open, setOpen] = useState(false)
  const [zoekterm, setZoekterm] = useState(geselecteerdeNaam)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync when geselecteerdeKlantId changes (e.g. after navigation)
  useEffect(() => {
    if (!open) {
      setZoekterm(geselecteerdeNaam)
    }
  }, [geselecteerdeNaam, open])

  const gefilterd = zoekterm.trim()
    ? klanten.filter(k => k.naam.toLowerCase().includes(zoekterm.toLowerCase().trim()))
    : klanten

  const selecteer = useCallback((klantId: string | null) => {
    setOpen(false)
    if (klantId === null) {
      setZoekterm('')
      router.push('/dashboard')
    } else {
      const naam = klanten.find(k => k.id === klantId)?.naam ?? ''
      setZoekterm(naam)
      router.push('?klant=' + klantId)
    }
  }, [klanten, router])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setZoekterm(geselecteerdeNaam)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [geselecteerdeNaam])

  const handleFocus = () => {
    setOpen(true)
    setZoekterm('')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoekterm(e.target.value)
    setOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setZoekterm(geselecteerdeNaam)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative w-64">
      {/* Input */}
      <div className="relative">
        {/* Search icon */}
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="14" height="14" viewBox="0 0 16 16" fill="none"
        >
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={zoekterm}
          onFocus={handleFocus}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Zoek klant…"
          autoComplete="off"
          className="form-input pl-8 pr-7 text-sm"
        />

        {/* Clear button — visible when a customer is selected */}
        {geselecteerdeKlantId && !open && (
          <button
            type="button"
            onClick={() => selecteer(null)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Filter wissen"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {/* Chevron — visible when no customer selected */}
        {!geselecteerdeKlantId && (
          <svg
            className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            width="11" height="11" viewBox="0 0 12 12" fill="none"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-md overflow-hidden">
          <ul className="max-h-[300px] overflow-y-auto py-1 text-sm">
            {/* Alle klanten option */}
            <li>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); selecteer(null) }}
                className={`w-full text-left px-3 py-2 transition-colors ${
                  !geselecteerdeKlantId
                    ? 'bg-violet-50 text-violet-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                Alle klanten
              </button>
            </li>

            {/* Divider */}
            <li className="border-t border-gray-100 my-1" aria-hidden="true" />

            {/* Results */}
            {gefilterd.length === 0 ? (
              <li className="px-3 py-2 text-gray-400 text-xs">Geen klanten gevonden</li>
            ) : (
              gefilterd.map(klant => (
                <li key={klant.id}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); selecteer(klant.id) }}
                    className={`w-full text-left px-3 py-2 transition-colors truncate ${
                      klant.id === geselecteerdeKlantId
                        ? 'bg-violet-50 text-violet-700 font-medium'
                        : 'text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {klant.naam}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
