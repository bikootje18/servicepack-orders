import { describe, it, expect } from 'vitest'
import { deadlineKleur } from './dashboard'

describe('deadlineKleur', () => {
  it('returns "rood" for a past deadline', () => {
    expect(deadlineKleur('2020-01-01')).toBe('rood')
  })
  it('returns "oranje" for today', () => {
    const vandaag = new Date().toISOString().split('T')[0]
    expect(deadlineKleur(vandaag)).toBe('oranje')
  })
  it('returns "oranje" for tomorrow', () => {
    const morgen = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    expect(deadlineKleur(morgen)).toBe('oranje')
  })
  it('returns null for a far-future deadline', () => {
    expect(deadlineKleur('2099-12-31')).toBeNull()
  })
  it('returns null for null deadline', () => {
    expect(deadlineKleur(null)).toBeNull()
  })
})
