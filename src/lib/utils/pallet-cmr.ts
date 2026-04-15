import type { LosPalletType } from '@/lib/constants/pallet-producten'
import { losPalletLabel } from '@/lib/constants/pallet-producten'

export interface PalletInvoerRegel {
  naam: string
  palletType: LosPalletType
  krattenPerPallet: number
  modus: 'pallets' | 'kratten'
  waarde: number
}

export interface CmrRegel {
  naam: string
  palletType: LosPalletType
  palletTypeLabel: string
  kratten: number
  isVollePallet: boolean
  aantalPallets?: number
  krattenPerPallet?: number
}

export function berekenCmrRegels(invoer: PalletInvoerRegel[]): CmrRegel[] {
  return invoer
    .filter(r => r.waarde > 0)
    .map(r => {
      if (r.modus === 'pallets') {
        return {
          naam: r.naam,
          palletType: r.palletType,
          palletTypeLabel: losPalletLabel(r.palletType),
          kratten: r.waarde * r.krattenPerPallet,
          isVollePallet: true,
          aantalPallets: r.waarde,
          krattenPerPallet: r.krattenPerPallet,
        }
      }
      return {
        naam: r.naam,
        palletType: r.palletType,
        palletTypeLabel: losPalletLabel(r.palletType),
        kratten: r.waarde,
        isVollePallet: false,
      }
    })
}

export function berekenPalletTotalen(regels: CmrRegel[]): Record<string, number> {
  const totalen: Record<string, number> = {}
  for (const r of regels) {
    const label = r.palletTypeLabel
    const pallets = r.isVollePallet ? (r.aantalPallets ?? 1) : 1
    totalen[label] = (totalen[label] ?? 0) + pallets
  }
  return totalen
}
