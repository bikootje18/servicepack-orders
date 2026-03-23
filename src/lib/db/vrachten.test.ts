import { describe, it, expect } from 'vitest'
import { berekenVrachtBedrag } from './vrachten'

describe('berekenVrachtBedrag', () => {
  it('computes total from multiple order tarifeven', () => {
    const regels = [
      { aantal_geleverd: 1000, tarief: 0.05 },
      { aantal_geleverd: 500, tarief: 0.08 },
    ]
    expect(berekenVrachtBedrag(regels)).toBe(90.00)
  })

  it('rounds to 2 decimal places', () => {
    const regels = [{ aantal_geleverd: 3, tarief: 0.333 }]
    expect(berekenVrachtBedrag(regels)).toBe(1.00)
  })

  it('returns 0 for empty regels', () => {
    expect(berekenVrachtBedrag([])).toBe(0)
  })

  it('handles floating-point tarief correctly', () => {
    // 1 * 0.575 with Math.round would give 0.57 due to IEEE 754
    // Number(toFixed(2)) handles this correctly
    const regels = [{ aantal_geleverd: 2, tarief: 0.155 }]
    expect(berekenVrachtBedrag(regels)).toBe(0.31)
  })
})
