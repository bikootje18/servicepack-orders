'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'

interface Props {
  klanten: { id: string; naam: string }[]
  geselecteerdeKlantId?: string
}

export function KlantCombobox({ klanten, geselecteerdeKlantId }: Props) {
  const router = useRouter()
  const geselecteerdeNaam = klanten.find(k => k.id === geselecteerdeKlantId)?.naam ?? null

  const [open, setOpen] = useState(false)
  const [zoekterm, setZoekterm] = useState('')
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const gefilterd = zoekterm.trim()
    ? klanten.filter(k => k.naam.toLowerCase().includes(zoekterm.toLowerCase().trim()))
    : klanten

  const openDropdown = () => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    setOpen(true)
  }

  const selecteer = useCallback((klantId: string | null) => {
    setOpen(false)
    setZoekterm('')
    router.push(klantId === null ? '/dashboard' : '?klant=' + klantId)
  }, [router])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
    else setZoekterm('')
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Check if click is inside the portal dropdown
        const dropdown = document.getElementById('klant-combobox-dropdown')
        if (dropdown && dropdown.contains(e.target as Node)) return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const dropdown = open ? (
    <div
      id="klant-combobox-dropdown"
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden"
    >
      {/* Zoekbalk */}
      <div className="p-2 border-b border-gray-100">
        <div className="relative flex items-center">
          <svg className="pointer-events-none absolute left-2.5 text-gray-400 shrink-0" width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={zoekterm}
            onChange={e => setZoekterm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
            placeholder="Zoek klant…"
            autoComplete="off"
            className="w-full rounded-md border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Lijst */}
      <ul className="max-h-[280px] overflow-y-auto py-1 text-sm">
        <li>
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); selecteer(null) }}
            className={`w-full text-left px-3 py-2 transition-colors ${
              !geselecteerdeKlantId ? 'bg-violet-50 text-violet-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Alle klanten
          </button>
        </li>
        <li className="border-t border-gray-100 my-1" aria-hidden="true" />
        {gefilterd.length === 0 ? (
          <li className="px-3 py-2 text-gray-400 text-xs">Geen klanten gevonden</li>
        ) : (
          gefilterd.map(klant => (
            <li key={klant.id}>
              <button
                type="button"
                onMouseDown={e => { e.preventDefault(); selecteer(klant.id) }}
                className={`w-full text-left px-3 py-2 transition-colors ${
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
  ) : null

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger chip */}
      <button
        type="button"
        onClick={openDropdown}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all ${
          geselecteerdeNaam
            ? 'border-violet-300 bg-violet-50 text-violet-700 font-medium'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 opacity-60">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="max-w-[180px] truncate">
          {geselecteerdeNaam ?? 'Alle klanten'}
        </span>
        {geselecteerdeNaam ? (
          <span
            role="button"
            className="ml-0.5 flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-violet-200 transition-colors"
            onMouseDown={e => { e.stopPropagation(); selecteer(null) }}
            title="Filter wissen"
          >
            <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        ) : (
          <svg
            className={`shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            width="10" height="10" viewBox="0 0 12 12" fill="none"
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {typeof window !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
