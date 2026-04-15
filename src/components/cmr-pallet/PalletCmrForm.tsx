// src/components/cmr-pallet/PalletCmrForm.tsx
'use client'

import { useState } from 'react'
import { PALLET_PRODUCTEN, losPalletLabel } from '@/lib/constants/pallet-producten'
import type { LosPalletType } from '@/lib/constants/pallet-producten'
import { berekenCmrRegels } from '@/lib/utils/pallet-cmr'
import type { PalletInvoerRegel } from '@/lib/utils/pallet-cmr'

interface VasteRijState {
  geselecteerd: boolean
  modus: 'pallets' | 'kratten'
  waarde: string
}

interface HandmatigeRij {
  id: number
  naam: string
  palletType: LosPalletType
  krattenPerPallet: string
  modus: 'pallets' | 'kratten'
  waarde: string
}

const initVaste = (): VasteRijState[] =>
  PALLET_PRODUCTEN.map(() => ({ geselecteerd: false, modus: 'pallets', waarde: '' }))

export function PalletCmrForm() {
  const [vaste, setVaste] = useState<VasteRijState[]>(initVaste)
  const [handmatig, setHandmatig] = useState<HandmatigeRij[]>([])
  const [laden, setLaden] = useState(false)
  let nextId = 0

  function updateVaste(i: number, patch: Partial<VasteRijState>) {
    setVaste(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function voegHandmatigeRijToe() {
    setHandmatig(prev => [...prev, {
      id: Date.now() + nextId++,
      naam: '',
      palletType: 'chep',
      krattenPerPallet: '',
      modus: 'pallets',
      waarde: '',
    }])
  }

  function updateHandmatig(id: number, patch: Partial<HandmatigeRij>) {
    setHandmatig(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function verwijderHandmatig(id: number) {
    setHandmatig(prev => prev.filter(r => r.id !== id))
  }

  function bouwInvoer(): PalletInvoerRegel[] {
    const vasteRegels: PalletInvoerRegel[] = PALLET_PRODUCTEN
      .map((p, i) => ({ product: p, staat: vaste[i] }))
      .filter(({ staat }) => staat.geselecteerd && Number(staat.waarde) > 0)
      .map(({ product, staat }) => ({
        naam: product.naam,
        palletType: product.palletType,
        krattenPerPallet: product.krattenPerPallet,
        modus: staat.modus,
        waarde: Number(staat.waarde),
      }))

    const handmatigeRegels: PalletInvoerRegel[] = handmatig
      .filter(r => r.naam.trim() && Number(r.waarde) > 0)
      .map(r => ({
        naam: r.naam.trim(),
        palletType: r.palletType,
        krattenPerPallet: r.modus === 'pallets' ? Number(r.krattenPerPallet) || 1 : 1,
        modus: r.modus,
        waarde: Number(r.waarde),
      }))

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

  return (
    <div>
      {/* Vaste producten */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium">
              <th className="w-8 py-2"></th>
              <th className="text-left py-2 pr-4">Product</th>
              <th className="text-left py-2 pr-4">Pallet</th>
              <th className="text-left py-2 pr-4">Kratten/pallet</th>
              <th className="text-left py-2 pr-4">Modus</th>
              <th className="text-left py-2">Aantal</th>
            </tr>
          </thead>
          <tbody>
            {PALLET_PRODUCTEN.map((product, i) => {
              const staat = vaste[i]
              return (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${staat.geselecteerd ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-1.5">
                    <input
                      type="checkbox"
                      checked={staat.geselecteerd}
                      onChange={e => updateVaste(i, { geselecteerd: e.target.checked })}
                      className="form-checkbox"
                    />
                  </td>
                  <td className="py-1.5 pr-4">
                    <span className={staat.geselecteerd ? 'font-medium' : 'text-gray-600'}>
                      {product.naam}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">{product.artikelnummer}</span>
                  </td>
                  <td className="py-1.5 pr-4 text-gray-500">{losPalletLabel(product.palletType)}</td>
                  <td className="py-1.5 pr-4 text-gray-500 tabular-nums">{product.krattenPerPallet}</td>
                  <td className="py-1.5 pr-4">
                    {staat.geselecteerd && (
                      <select
                        value={staat.modus}
                        onChange={e => updateVaste(i, { modus: e.target.value as 'pallets' | 'kratten' })}
                        className="form-input py-0.5 text-xs"
                      >
                        <option value="pallets">Pallets</option>
                        <option value="kratten">Kratten</option>
                      </select>
                    )}
                  </td>
                  <td className="py-1.5">
                    {staat.geselecteerd && (
                      <input
                        type="number"
                        min={1}
                        value={staat.waarde}
                        onChange={e => updateVaste(i, { waarde: e.target.value })}
                        placeholder={staat.modus === 'pallets' ? 'Pallets' : 'Kratten'}
                        className="form-input w-24 tabular-nums"
                        autoFocus={staat.waarde === ''}
                      />
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
          <div className="space-y-2">
            {handmatig.map(rij => (
              <div key={rij.id} className="flex gap-2 items-center text-sm">
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
                  className="form-input w-24"
                >
                  <option value="chep">Chep</option>
                  <option value="euro">Euro</option>
                  <option value="dpb">DPB</option>
                </select>
                <select
                  value={rij.modus}
                  onChange={e => updateHandmatig(rij.id, { modus: e.target.value as 'pallets' | 'kratten' })}
                  className="form-input w-24"
                >
                  <option value="pallets">Pallets</option>
                  <option value="kratten">Kratten</option>
                </select>
                {rij.modus === 'pallets' && (
                  <input
                    type="number"
                    min={1}
                    placeholder="Kratten/pallet"
                    value={rij.krattenPerPallet}
                    onChange={e => updateHandmatig(rij.id, { krattenPerPallet: e.target.value })}
                    className="form-input w-28"
                  />
                )}
                <input
                  type="number"
                  min={1}
                  placeholder={rij.modus === 'pallets' ? 'Pallets' : 'Kratten'}
                  value={rij.waarde}
                  onChange={e => updateHandmatig(rij.id, { waarde: e.target.value })}
                  className="form-input w-24"
                />
                <button
                  type="button"
                  onClick={() => verwijderHandmatig(rij.id)}
                  className="text-gray-400 hover:text-red-500 text-xs px-2"
                >
                  ✕
                </button>
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
