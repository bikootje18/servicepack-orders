// src/components/cmr-pallet/PalletCmrForm.tsx
'use client'

import { useState } from 'react'
import { PALLET_PRODUCTEN, losPalletLabel } from '@/lib/constants/pallet-producten'
import type { LosPalletType } from '@/lib/constants/pallet-producten'
import { berekenCmrRegels } from '@/lib/utils/pallet-cmr'
import type { PalletInvoerRegel } from '@/lib/utils/pallet-cmr'

interface Entry {
  aantalPallets: string
  krattenPerPallet: string
}

interface VasteRijState {
  geselecteerd: boolean
  entries: Entry[]
}

interface HandmatigeRij {
  id: number
  naam: string
  palletType: LosPalletType
  entries: Entry[]
}

const initVaste = (): VasteRijState[] =>
  PALLET_PRODUCTEN.map(p => ({
    geselecteerd: false,
    entries: [{ aantalPallets: '', krattenPerPallet: String(p.krattenPerPallet) }],
  }))

export function PalletCmrForm() {
  const [vaste, setVaste] = useState<VasteRijState[]>(initVaste)
  const [handmatig, setHandmatig] = useState<HandmatigeRij[]>([])
  const [laden, setLaden] = useState(false)

  function updateVasteEntry(i: number, ei: number, patch: Partial<Entry>) {
    setVaste(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      return { ...r, entries: r.entries.map((e, eidx) => eidx === ei ? { ...e, ...patch } : e) }
    }))
  }

  function addVasteEntry(i: number) {
    setVaste(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      return { ...r, entries: [...r.entries, { aantalPallets: '', krattenPerPallet: String(PALLET_PRODUCTEN[i].krattenPerPallet) }] }
    }))
  }

  function removeVasteEntry(i: number, ei: number) {
    setVaste(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      return { ...r, entries: r.entries.filter((_, eidx) => eidx !== ei) }
    }))
  }

  function toggleVaste(i: number, checked: boolean) {
    setVaste(prev => prev.map((r, idx) => {
      if (idx !== i) return r
      // Reset to single default entry when re-selecting
      if (checked && r.entries.length === 0) {
        return { ...r, geselecteerd: true, entries: [{ aantalPallets: '', krattenPerPallet: String(PALLET_PRODUCTEN[i].krattenPerPallet) }] }
      }
      return { ...r, geselecteerd: checked }
    }))
  }

  function voegHandmatigeRijToe() {
    setHandmatig(prev => [...prev, {
      id: Date.now(),
      naam: '',
      palletType: 'chep',
      entries: [{ aantalPallets: '', krattenPerPallet: '' }],
    }])
  }

  function updateHandmatigeEntry(id: number, ei: number, patch: Partial<Entry>) {
    setHandmatig(prev => prev.map(r => {
      if (r.id !== id) return r
      return { ...r, entries: r.entries.map((e, eidx) => eidx === ei ? { ...e, ...patch } : e) }
    }))
  }

  function addHandmatigeEntry(id: number) {
    setHandmatig(prev => prev.map(r => {
      if (r.id !== id) return r
      return { ...r, entries: [...r.entries, { aantalPallets: '', krattenPerPallet: '' }] }
    }))
  }

  function removeHandmatigeEntry(id: number, ei: number) {
    setHandmatig(prev => prev.map(r => {
      if (r.id !== id) return r
      return { ...r, entries: r.entries.filter((_, eidx) => eidx !== ei) }
    }))
  }

  function updateHandmatig(id: number, patch: Partial<Omit<HandmatigeRij, 'entries'>>) {
    setHandmatig(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function verwijderHandmatig(id: number) {
    setHandmatig(prev => prev.filter(r => r.id !== id))
  }

  function bouwInvoer(): PalletInvoerRegel[] {
    const vasteRegels: PalletInvoerRegel[] = PALLET_PRODUCTEN
      .map((p, i) => ({ product: p, staat: vaste[i] }))
      .filter(({ staat }) => staat.geselecteerd)
      .map(({ product, staat }) => ({
        naam: product.naam,
        palletType: product.palletType,
        entries: staat.entries
          .filter(e => Number(e.aantalPallets) > 0 && Number(e.krattenPerPallet) > 0)
          .map(e => ({ aantalPallets: Number(e.aantalPallets), krattenPerPallet: Number(e.krattenPerPallet) })),
      }))
      .filter(r => r.entries.length > 0)

    const handmatigeRegels: PalletInvoerRegel[] = handmatig
      .filter(r => r.naam.trim())
      .map(r => ({
        naam: r.naam.trim(),
        palletType: r.palletType,
        entries: r.entries
          .filter(e => Number(e.aantalPallets) > 0 && Number(e.krattenPerPallet) > 0)
          .map(e => ({ aantalPallets: Number(e.aantalPallets), krattenPerPallet: Number(e.krattenPerPallet) })),
      }))
      .filter(r => r.entries.length > 0)

    return [...vasteRegels, ...handmatigeRegels]
  }

  const heeftInvoer = bouwInvoer().length > 0

  async function handleDownload() {
    setLaden(true)
    try {
      const invoer = bouwInvoer()
      const cmrRegels = berekenCmrRegels(invoer)
      const [{ pdf }, { createElement }, { LosCmrOverlayDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./LosCmrOverlayDocument'),
      ])
      const blob = await pdf(
        createElement(LosCmrOverlayDocument, { regels: cmrRegels, datum: new Date() }) as any
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cmr-pallet-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLaden(false)
    }
  }

  const geselecteerdAantal = vaste.filter(r => r.geselecteerd).length + handmatig.filter(r => r.naam.trim()).length
  const totaalPallets = bouwInvoer().reduce((s, r) => s + r.entries.reduce((es, e) => es + e.aantalPallets, 0), 0)

  // Groepeer per pallettype, behoud originele index voor state
  const groepen: { label: string; kleur: string; badgeKleur: string; items: { product: typeof PALLET_PRODUCTEN[0]; i: number }[] }[] = [
    {
      label: 'Chep',
      kleur: 'bg-amber-50 border-amber-200',
      badgeKleur: 'bg-amber-100 text-amber-800 border border-amber-200',
      items: PALLET_PRODUCTEN.map((p, i) => ({ product: p, i })).filter(({ product }) => product.palletType === 'chep'),
    },
    {
      label: 'Euro',
      kleur: 'bg-sky-50 border-sky-200',
      badgeKleur: 'bg-sky-100 text-sky-800 border border-sky-200',
      items: PALLET_PRODUCTEN.map((p, i) => ({ product: p, i })).filter(({ product }) => product.palletType === 'euro'),
    },
    {
      label: 'DPB',
      kleur: 'bg-emerald-50 border-emerald-200',
      badgeKleur: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      items: PALLET_PRODUCTEN.map((p, i) => ({ product: p, i })).filter(({ product }) => product.palletType === 'dpb'),
    },
  ]

  return (
    <div className="pb-24">

      {/* Productgroepen */}
      <div className="space-y-6">
        {groepen.map(groep => (
          <div key={groep.label}>
            {/* Sectieheader */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t border-x ${groep.kleur}`}>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${groep.badgeKleur}`}>
                {groep.label}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {groep.items.filter(({ i }) => vaste[i].geselecteerd).length}/{groep.items.length} geselecteerd
              </span>
            </div>

            {/* Productrijen */}
            <div className="border border-gray-200 rounded-b-lg overflow-hidden divide-y divide-gray-100">
              {groep.items.map(({ product, i }) => {
                const staat = vaste[i]
                return (
                  <div
                    key={i}
                    className={`relative transition-colors ${
                      staat.geselecteerd
                        ? 'bg-white'
                        : 'bg-white hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Paarse linkerbalk bij selectie */}
                    {staat.geselecteerd && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-violet-500" />
                    )}

                    <div className="flex items-start gap-3 px-4 py-2.5 pl-5">
                      {/* Checkbox */}
                      <div className="pt-0.5 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={staat.geselecteerd}
                          onChange={e => toggleVaste(i, e.target.checked)}
                          className="form-checkbox"
                        />
                      </div>

                      {/* Productnaam */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-sm ${staat.geselecteerd ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {product.naam}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{product.artikelnummer}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {product.krattenPerPallet} kratten/pallet
                        </div>
                      </div>

                      {/* Entry inputs — alleen zichtbaar als geselecteerd */}
                      {staat.geselecteerd && (
                        <div className="flex-shrink-0 space-y-1.5">
                          {staat.entries.map((entry, ei) => (
                            <div key={ei} className="flex items-center gap-1.5">
                              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                                <input
                                  type="number"
                                  min={1}
                                  value={entry.aantalPallets}
                                  onChange={e => updateVasteEntry(i, ei, { aantalPallets: e.target.value })}
                                  placeholder="0"
                                  className="w-12 text-right text-sm font-mono bg-transparent border-none outline-none tabular-nums text-gray-900"
                                />
                                <span className="text-gray-400 text-xs select-none">pal ×</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={entry.krattenPerPallet}
                                  onChange={e => updateVasteEntry(i, ei, { krattenPerPallet: e.target.value })}
                                  placeholder="0"
                                  className="w-12 text-right text-sm font-mono bg-transparent border-none outline-none tabular-nums text-gray-900"
                                />
                                <span className="text-gray-400 text-xs select-none">kr</span>
                              </div>
                              {ei === staat.entries.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => addVasteEntry(i)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md border border-dashed border-violet-300 text-violet-500 hover:bg-violet-50 hover:border-violet-400 text-xs font-bold transition-colors"
                                  title="Extra regel"
                                >
                                  +
                                </button>
                              )}
                              {staat.entries.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeVasteEntry(i, ei)}
                                  className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 text-xs transition-colors"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Handmatige rijen */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Overig / handmatig</p>
          <button
            type="button"
            onClick={voegHandmatigeRijToe}
            className="text-xs text-violet-600 hover:text-violet-800 font-medium flex items-center gap-1 transition-colors"
          >
            <span className="text-base leading-none">+</span> Voeg product toe
          </button>
        </div>

        {handmatig.length > 0 ? (
          <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {handmatig.map(rij => (
              <div key={rij.id} className="bg-white px-4 py-3">
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="text"
                    placeholder="Productnaam"
                    value={rij.naam}
                    onChange={e => updateHandmatig(rij.id, { naam: e.target.value })}
                    className="form-input flex-1 text-sm"
                  />
                  <select
                    value={rij.palletType}
                    onChange={e => updateHandmatig(rij.id, { palletType: e.target.value as LosPalletType })}
                    className="form-select w-24 text-sm"
                  >
                    <option value="chep">Chep</option>
                    <option value="euro">Euro</option>
                    <option value="dpb">DPB</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => verwijderHandmatig(rij.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
                  >
                    Verwijder
                  </button>
                </div>
                <div className="space-y-1.5">
                  {rij.entries.map((entry, ei) => (
                    <div key={ei} className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-1">
                        <input
                          type="number"
                          min={1}
                          value={entry.aantalPallets}
                          onChange={e => updateHandmatigeEntry(rij.id, ei, { aantalPallets: e.target.value })}
                          placeholder="0"
                          className="w-12 text-right text-sm font-mono bg-transparent border-none outline-none tabular-nums"
                        />
                        <span className="text-gray-400 text-xs select-none">pal ×</span>
                        <input
                          type="number"
                          min={1}
                          value={entry.krattenPerPallet}
                          onChange={e => updateHandmatigeEntry(rij.id, ei, { krattenPerPallet: e.target.value })}
                          placeholder="0"
                          className="w-12 text-right text-sm font-mono bg-transparent border-none outline-none tabular-nums"
                        />
                        <span className="text-gray-400 text-xs select-none">kr</span>
                      </div>
                      {ei === rij.entries.length - 1 && (
                        <button
                          type="button"
                          onClick={() => addHandmatigeEntry(rij.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-dashed border-violet-300 text-violet-500 hover:bg-violet-50 text-xs font-bold transition-colors"
                        >
                          +
                        </button>
                      )}
                      {rij.entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHandmatigeEntry(rij.id, ei)}
                          className="w-6 h-6 flex items-center justify-center rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 text-xs transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-400 text-center">
            Geen handmatige producten — klik "+ Voeg product toe" om iets toe te voegen
          </div>
        )}
      </div>

      {/* Sticky download footer */}
      <div className="fixed bottom-0 left-52 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-8 py-3 z-10">
        <div className="max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {geselecteerdAantal > 0 ? (
              <>
                <span>
                  <span className="font-semibold text-gray-800 tabular-nums">{geselecteerdAantal}</span>
                  {' '}product{geselecteerdAantal !== 1 ? 'en' : ''}
                </span>
                {totaalPallets > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>
                      <span className="font-semibold text-gray-800 tabular-nums">{totaalPallets}</span>
                      {' '}pallet{totaalPallets !== 1 ? 's' : ''} totaal
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-gray-400">Geen producten geselecteerd</span>
            )}
          </div>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!heeftInvoer || laden}
            className="btn-primary px-6 disabled:opacity-40 flex items-center gap-2"
          >
            {laden ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                PDF laden...
              </>
            ) : (
              'CMR downloaden'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
