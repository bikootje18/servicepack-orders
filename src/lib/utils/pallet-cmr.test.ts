import { describe, it, expect } from 'vitest'
import { berekenCmrRegels, berekenPalletTotalen } from './pallet-cmr'
import type { PalletInvoerRegel } from './pallet-cmr'

describe('berekenCmrRegels', () => {
  it('volle pallets: vermenigvuldigt kratten per pallet met aantal', () => {
    const invoer: PalletInvoerRegel[] = [{
      naam: 'Duvel 33cl',
      palletType: 'chep',
      krattenPerPallet: 63,
      modus: 'pallets',
      waarde: 3,
    }]
    const [regel] = berekenCmrRegels(invoer)
    expect(regel.kratten).toBe(189)
    expect(regel.aantalPallets).toBe(3)
    expect(regel.isVollePallet).toBe(true)
  })

  it('losse kratten: gebruikt waarde direct als kratten', () => {
    const invoer: PalletInvoerRegel[] = [{
      naam: 'Liefmans',
      palletType: 'chep',
      krattenPerPallet: 70,
      modus: 'kratten',
      waarde: 29,
    }]
    const [regel] = berekenCmrRegels(invoer)
    expect(regel.kratten).toBe(29)
    expect(regel.isVollePallet).toBe(false)
  })

  it('filtert regels met waarde 0 eruit', () => {
    const invoer: PalletInvoerRegel[] = [
      { naam: 'Duvel 33cl', palletType: 'chep', krattenPerPallet: 63, modus: 'pallets', waarde: 0 },
      { naam: 'Orval',      palletType: 'chep', krattenPerPallet: 49, modus: 'pallets', waarde: 2 },
    ]
    const regels = berekenCmrRegels(invoer)
    expect(regels).toHaveLength(1)
    expect(regels[0].naam).toBe('Orval')
  })
})

describe('berekenPalletTotalen', () => {
  it('groepeert per pallettype', () => {
    const regels = [
      { naam: 'Duvel',    palletType: 'chep' as const, kratten: 189, isVollePallet: true,  aantalPallets: 3, krattenPerPallet: 63,  palletTypeLabel: 'Chep' },
      { naam: 'Liefmans', palletType: 'chep' as const, kratten: 29,  isVollePallet: false, palletTypeLabel: 'Chep' },
      { naam: 'Becks',    palletType: 'dpb'  as const, kratten: 60,  isVollePallet: true,  aantalPallets: 1, krattenPerPallet: 60,  palletTypeLabel: 'DPB' },
    ]
    const totalen = berekenPalletTotalen(regels)
    expect(totalen['Chep']).toBe(4)  // 3 volle + 1 losse pallet
    expect(totalen['DPB']).toBe(1)
  })
})
