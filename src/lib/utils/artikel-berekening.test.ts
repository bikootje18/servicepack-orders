import { describe, it, expect } from 'vitest'
import { berekenAantal } from './artikel-berekening'

describe('berekenAantal', () => {
  describe('delen', () => {
    it('deelt en rondt naar boven af', () => {
      expect(berekenAantal(100, 'delen', 50)).toBe(2)
      expect(berekenAantal(101, 'delen', 50)).toBe(3)
    })

    it('rondt altijd naar boven — nooit naar beneden', () => {
      expect(berekenAantal(100, 'delen', 3)).toBe(34) // 100/3 = 33.3 → 34
    })

    it('geeft 1 terug als order_grootte kleiner is dan factor', () => {
      expect(berekenAantal(10, 'delen', 50)).toBe(1) // ceil(10/50) = 1
    })
  })

  describe('vermenigvuldigen', () => {
    it('vermenigvuldigt en rondt naar dichtstbijzijnde af', () => {
      expect(berekenAantal(100, 'vermenigvuldigen', 2)).toBe(200)
      expect(berekenAantal(100, 'vermenigvuldigen', 0.5)).toBe(50)
    })

    it('rondt 0.5 naar boven', () => {
      expect(berekenAantal(1, 'vermenigvuldigen', 1.5)).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('geeft null terug als orderGrootte null is', () => {
      expect(berekenAantal(null, 'delen', 50)).toBeNull()
    })

    it('geeft null terug als factor 0 is', () => {
      expect(berekenAantal(100, 'delen', 0)).toBeNull()
    })
  })
})
