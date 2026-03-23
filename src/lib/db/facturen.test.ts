import { describe, it, expect } from 'vitest'
import { berekenFactuurBedrag } from './facturen'

describe('berekenFactuurBedrag', () => {
  it('multiplies tarief by total units', () => {
    expect(berekenFactuurBedrag(0.85, 1000)).toBe(850)
  })
  it('rounds to 2 decimal places', () => {
    expect(berekenFactuurBedrag(0.333, 3)).toBeCloseTo(1.0, 2)
  })
})
