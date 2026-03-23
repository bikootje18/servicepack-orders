import { describe, it, expect } from 'vitest'
import { buildKlantQuery, validateKlant } from './klanten'

describe('validateKlant', () => {
  it('rejects empty naam', () => {
    expect(validateKlant({ naam: '' })).toEqual({ naam: 'Naam is verplicht' })
  })
  it('accepts valid naam', () => {
    expect(validateKlant({ naam: 'Bedrijf X' })).toEqual({})
  })
})
