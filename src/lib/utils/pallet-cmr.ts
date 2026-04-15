// src/lib/utils/pallet-cmr.ts
import type { LosPalletType } from '@/lib/constants/pallet-producten'
import { losPalletLabel } from '@/lib/constants/pallet-producten'

export interface PalletEntry {
  aantalPallets: number
  krattenPerPallet: number
}

export interface PalletInvoerRegel {
  naam: string
  palletType: LosPalletType
  entries: PalletEntry[]
}

export interface CmrRegelEntry {
  aantalPallets: number
  krattenPerPallet: number
  kratten: number
}

export interface CmrRegel {
  naam: string
  palletType: LosPalletType
  palletTypeLabel: string
  entries: CmrRegelEntry[]
  totaalKratten: number
  totaalPallets: number
}

export function berekenCmrRegels(invoer: PalletInvoerRegel[]): CmrRegel[] {
  return invoer
    .map(r => {
      const validEntries = r.entries.filter(e => e.aantalPallets > 0 && e.krattenPerPallet > 0)
      if (validEntries.length === 0) return null
      const cmrEntries: CmrRegelEntry[] = validEntries.map(e => ({
        aantalPallets: e.aantalPallets,
        krattenPerPallet: e.krattenPerPallet,
        kratten: e.aantalPallets * e.krattenPerPallet,
      }))
      return {
        naam: r.naam,
        palletType: r.palletType,
        palletTypeLabel: losPalletLabel(r.palletType),
        entries: cmrEntries,
        totaalKratten: cmrEntries.reduce((s, e) => s + e.kratten, 0),
        totaalPallets: cmrEntries.reduce((s, e) => s + e.aantalPallets, 0),
      }
    })
    .filter((r): r is CmrRegel => r !== null)
}

export function berekenPalletTotalen(regels: CmrRegel[]): Record<string, number> {
  const totalen: Record<string, number> = {}
  for (const r of regels) {
    const label = r.palletTypeLabel
    totalen[label] = (totalen[label] ?? 0) + r.totaalPallets
  }
  return totalen
}
