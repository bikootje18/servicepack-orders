import { describe, it, expect } from 'vitest'
import { groepeerdOpKlant } from './voorraad'
import type { VoorraadRegel } from '@/types'

describe('groepeerdOpKlant', () => {
  const regels: VoorraadRegel[] = [
    { order_id: '1', order_nummer: 'A', klant_naam: 'Klant X', order_grootte: 100, totaal_geleverd: 40, resterend: 60 },
    { order_id: '2', order_nummer: 'B', klant_naam: 'Klant X', order_grootte: 50, totaal_geleverd: 50, resterend: 0 },
    { order_id: '3', order_nummer: 'C', klant_naam: 'Klant Y', order_grootte: 200, totaal_geleverd: 100, resterend: 100 },
  ]

  it('groups by klant_naam', () => {
    const groepen = groepeerdOpKlant(regels)
    expect(Object.keys(groepen)).toEqual(['Klant X', 'Klant Y'])
  })

  it('includes only orders with resterend > 0', () => {
    const groepen = groepeerdOpKlant(regels)
    expect(groepen['Klant X']).toHaveLength(1)
    expect(groepen['Klant X'][0].order_nummer).toBe('A')
  })
})
