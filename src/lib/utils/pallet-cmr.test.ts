// src/lib/utils/pallet-cmr.test.ts
import { describe, it, expect } from 'vitest'
import { berekenCmrRegels, berekenPalletTotalen } from './pallet-cmr'
import type { PalletInvoerRegel } from './pallet-cmr'

describe('berekenCmrRegels', () => {
  it('enkelvoudige entry: berekent kratten correct', () => {
    const invoer: PalletInvoerRegel[] = [{
      naam: 'Duvel 33cl',
      palletType: 'chep',
      entries: [{ aantalPallets: 3, krattenPerPallet: 63 }],
    }]
    const [regel] = berekenCmrRegels(invoer)
    expect(regel.entries[0].kratten).toBe(189)
    expect(regel.totaalKratten).toBe(189)
    expect(regel.totaalPallets).toBe(3)
  })

  it('meerdere entries: telt op tot totaal', () => {
    const invoer: PalletInvoerRegel[] = [{
      naam: 'Liefmans',
      palletType: 'chep',
      entries: [
        { aantalPallets: 8, krattenPerPallet: 70 },
        { aantalPallets: 1, krattenPerPallet: 9 },
      ],
    }]
    const [regel] = berekenCmrRegels(invoer)
    expect(regel.entries).toHaveLength(2)
    expect(regel.entries[0].kratten).toBe(560)
    expect(regel.entries[1].kratten).toBe(9)
    expect(regel.totaalKratten).toBe(569)
    expect(regel.totaalPallets).toBe(9)
  })

  it('filtert producten zonder geldige entries eruit', () => {
    const invoer: PalletInvoerRegel[] = [
      { naam: 'Duvel 33cl', palletType: 'chep', entries: [{ aantalPallets: 0, krattenPerPallet: 63 }] },
      { naam: 'Orval',      palletType: 'chep', entries: [{ aantalPallets: 2, krattenPerPallet: 49 }] },
    ]
    const regels = berekenCmrRegels(invoer)
    expect(regels).toHaveLength(1)
    expect(regels[0].naam).toBe('Orval')
  })

  it('filtert individuele entries met aantalPallets 0 eruit', () => {
    const invoer: PalletInvoerRegel[] = [{
      naam: 'Liefmans',
      palletType: 'chep',
      entries: [
        { aantalPallets: 8, krattenPerPallet: 70 },
        { aantalPallets: 0, krattenPerPallet: 9 },
      ],
    }]
    const [regel] = berekenCmrRegels(invoer)
    expect(regel.entries).toHaveLength(1)
    expect(regel.totaalPallets).toBe(8)
  })
})

describe('berekenPalletTotalen', () => {
  it('groepeert totaalPallets per pallettype', () => {
    const regels = berekenCmrRegels([
      {
        naam: 'Duvel',
        palletType: 'chep',
        entries: [{ aantalPallets: 3, krattenPerPallet: 63 }, { aantalPallets: 1, krattenPerPallet: 9 }],
      },
      {
        naam: 'Becks',
        palletType: 'dpb',
        entries: [{ aantalPallets: 2, krattenPerPallet: 60 }],
      },
    ])
    const totalen = berekenPalletTotalen(regels)
    expect(totalen['Chep']).toBe(4)
    expect(totalen['DPB']).toBe(2)
  })
})
