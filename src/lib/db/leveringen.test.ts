import { describe, it, expect } from 'vitest'
import { validateLevering } from './leveringen'

describe('validateLevering', () => {
  it('rejects aantal_geleverd > resterend', () => {
    const errors = validateLevering({ aantal_geleverd: 150, resterend: 100, leverdatum: '2026-03-23' })
    expect(errors.aantal_geleverd).toBeDefined()
  })
  it('rejects aantal_geleverd of 0', () => {
    const errors = validateLevering({ aantal_geleverd: 0, resterend: 100, leverdatum: '2026-03-23' })
    expect(errors.aantal_geleverd).toBeDefined()
  })
  it('accepts valid levering', () => {
    const errors = validateLevering({ aantal_geleverd: 50, resterend: 100, leverdatum: '2026-03-23' })
    expect(errors).toEqual({})
  })
})
