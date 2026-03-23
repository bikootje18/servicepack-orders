import { describe, it, expect } from 'vitest'
import { validateOrder, berekenResterend } from './orders'

describe('validateOrder', () => {
  const base = {
    order_nummer: 'ORD-001',
    order_code: 'alpha_sticker',
    klant_id: 'uuid-1',
    facturatie_code_id: 'uuid-2',
    order_grootte: 100,
  }

  it('rejects empty order_nummer', () => {
    const errors = validateOrder({ ...base, order_nummer: '' })
    expect(errors.order_nummer).toBeDefined()
  })
  it('rejects order_grootte of 0', () => {
    const errors = validateOrder({ ...base, order_grootte: 0 })
    expect(errors.order_grootte).toBeDefined()
  })
  it('accepts valid order', () => {
    expect(validateOrder(base)).toEqual({})
  })
})

describe('berekenResterend', () => {
  it('returns order_grootte minus total delivered', () => {
    expect(berekenResterend(100, 40)).toBe(60)
  })
  it('returns 0 when fully delivered', () => {
    expect(berekenResterend(100, 100)).toBe(0)
  })
})
