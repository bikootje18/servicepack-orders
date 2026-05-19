import { describe, it, expect } from 'vitest'
import { statusLabel, statusKleurKlasse } from './portal-status'

describe('statusLabel', () => {
  it('returns Dutch label for each status', () => {
    expect(statusLabel('concept')).toBe('Concept')
    expect(statusLabel('bevestigd')).toBe('Bevestigd')
    expect(statusLabel('in_behandeling')).toBe('In behandeling')
    expect(statusLabel('geleverd')).toBe('Geleverd')
    expect(statusLabel('gefactureerd')).toBe('Gefactureerd')
  })
})

describe('statusKleurKlasse', () => {
  it('returns a non-empty string for each status', () => {
    const statuses = ['concept', 'bevestigd', 'in_behandeling', 'geleverd', 'gefactureerd'] as const
    for (const s of statuses) {
      expect(statusKleurKlasse(s).length).toBeGreaterThan(0)
    }
  })

  it('returns distinct classes for different statuses', () => {
    expect(statusKleurKlasse('concept')).not.toBe(statusKleurKlasse('geleverd'))
  })
})
