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

  // Alfabetische volgorde, originele index bewaren voor state
  const gesorteerd = PALLET_PRODUCTEN
    .map((p, i) => ({ product: p, i }))
    .sort((a, b) => a.product.naam.localeCompare(b.product.naam, 'nl'))

  return (
    <div>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium">
              <th className="w-8 py-2"></th>
              <th className="text-left py-2 pr-4">Product</th>
              <th className="text-left py-2 pr-4">Pallet</th>
              <th className="text-left py-2 pr-4">Kratten/pallet</th>
              <th className="text-left py-2">Pallets × Kratten</th>
            </tr>
          </thead>
          <tbody>
            {gesorteerd.map(({ product, i }) => {
              const staat = vaste[i]
              return (
                <tr
                  key={i}
                  className={`border-b border-gray-100 align-top ${staat.geselecteerd ? 'bg-violet-50' : ''}`}
                >
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={staat.geselecteerd}
                      onChange={e => toggleVaste(i, e.target.checked)}
                      className="form-checkbox"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <span className={staat.geselecteerd ? 'font-medium' : 'text-gray-600'}>
                      {product.naam}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">{product.artikelnummer}</span>
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{losPalletLabel(product.palletType)}</td>
                  <td className="py-2 pr-4 text-gray-500 tabular-nums">{product.krattenPerPallet}</td>
                  <td className="py-2">
                    {staat.geselecteerd && (
                      <div className="space-y-1">
                        {staat.entries.map((entry, ei) => (
                          <div key={ei} className="flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={entry.aantalPallets}
                              onChange={e => updateVasteEntry(i, ei, { aantalPallets: e.target.value })}
                              placeholder="pallets"
                              className="form-input w-20 tabular-nums"
                            />
                            <span className="text-gray-400 text-xs">×</span>
                            <input
                              type="number"
                              min={1}
                              value={entry.krattenPerPallet}
                              onChange={e => updateVasteEntry(i, ei, { krattenPerPallet: e.target.value })}
                              placeholder="kratten"
                              className="form-input w-20 tabular-nums"
                            />
                            {ei === staat.entries.length - 1 && Number(entry.aantalPallets) > 0 && (
                              <button
                                type="button"
                                onClick={() => addVasteEntry(i)}
                                className="h-8 px-2.5 rounded border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap"
                                title="Extra regel toevoegen"
                              >
                                + Restje
                              </button>
                            )}
                            {staat.entries.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeVasteEntry(i, ei)}
                                className="h-8 px-2.5 rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 text-xs font-medium transition-colors whitespace-nowrap"
                              >
                                Verwijder
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Handmatige rijen */}
      {handmatig.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Handmatig</p>
          <div className="space-y-3">
            {handmatig.map(rij => (
              <div key={rij.id} className="border border-gray-200 rounded p-3">
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="text"
                    placeholder="Productnaam"
                    value={rij.naam}
                    onChange={e => updateHandmatig(rij.id, { naam: e.target.value })}
                    className="form-input flex-1"
                  />
                  <select
                    value={rij.palletType}
                    onChange={e => updateHandmatig(rij.id, { palletType: e.target.value as LosPalletType })}
                    className="form-select w-24"
                  >
                    <option value="chep">Chep</option>
                    <option value="euro">Euro</option>
                    <option value="dpb">DPB</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => verwijderHandmatig(rij.id)}
                    className="text-gray-400 hover:text-red-500 text-xs px-2"
                  >
                    Verwijder
                  </button>
                </div>
                <div className="space-y-1">
                  {rij.entries.map((entry, ei) => (
                    <div key={ei} className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        value={entry.aantalPallets}
                        onChange={e => updateHandmatigeEntry(rij.id, ei, { aantalPallets: e.target.value })}
                        placeholder="pallets"
                        className="form-input w-20 tabular-nums"
                      />
                      <span className="text-gray-400 text-xs">×</span>
                      <input
                        type="number"
                        min={1}
                        value={entry.krattenPerPallet}
                        onChange={e => updateHandmatigeEntry(rij.id, ei, { krattenPerPallet: e.target.value })}
                        placeholder="kratten/pallet"
                        className="form-input w-24 tabular-nums"
                      />
                      {ei === rij.entries.length - 1 && Number(entry.aantalPallets) > 0 && (
                        <button
                          type="button"
                          onClick={() => addHandmatigeEntry(rij.id)}
                          className="h-8 px-2.5 rounded border border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          + Restje
                        </button>
                      )}
                      {rij.entries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHandmatigeEntry(rij.id, ei)}
                          className="h-8 px-2.5 rounded border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 text-xs font-medium transition-colors"
                        >
                          Verwijder
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acties */}
      <div className="flex gap-3 items-center mt-4">
        <button
          type="button"
          onClick={voegHandmatigeRijToe}
          className="text-sm border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 text-gray-600"
        >
          + Voeg toe
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!heeftInvoer || laden}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {laden ? 'PDF laden...' : 'CMR downloaden'}
        </button>
      </div>
    </div>
  )
}
