import { describe, it, expect } from 'vitest'
import { isGeldigeLocatie } from './locatie'

describe('isGeldigeLocatie', () => {
  it('returns true for a valid locatie', () => {
    expect(isGeldigeLocatie('Pauvreweg')).toBe(true)
  })
  it('returns true for Lokkerdreef20', () => {
    expect(isGeldigeLocatie('Lokkerdreef20')).toBe(true)
  })
  it('returns false for an unknown locatie', () => {
    expect(isGeldigeLocatie('Onbekend')).toBe(false)
  })
  it('returns false for empty string', () => {
    expect(isGeldigeLocatie('')).toBe(false)
  })
})
