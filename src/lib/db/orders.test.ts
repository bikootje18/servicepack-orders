import { describe, it, expect } from 'vitest'
import { validateOrder, berekenResterend, bepaalSplitNummer } from './orders'

describe('validateOrder', () => {
  const base = {
    order_nummer: 'ORD-001',
    order_code: 'alpha_sticker',
    klant_id: 'uuid-1',
    facturatie_code_id: 'uuid-2',
    order_grootte: 100,
    locatie: 'Pauvreweg',
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
  it('rejects missing locatie', () => {
    const errors = validateOrder({ ...base, locatie: '' })
    expect(errors.locatie).toBeDefined()
  })
  it('accepts valid locatie', () => {
    const errors = validateOrder({ ...base, locatie: 'Pauvreweg' })
    expect(errors.locatie).toBeUndefined()
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

describe('bepaalSplitNummer', () => {
  it('geeft A als suffix als er geen gesplitste orders zijn', () => {
    expect(bepaalSplitNummer('ANC26-20260319', [])).toBe('ANC26-20260319A')
  })
  it('geeft B als A al bestaat', () => {
    expect(bepaalSplitNummer('ANC26-20260319', ['ANC26-20260319A'])).toBe('ANC26-20260319B')
  })
  it('geeft C als A en B al bestaan', () => {
    expect(bepaalSplitNummer('ANC26-20260319', ['ANC26-20260319A', 'ANC26-20260319B'])).toBe('ANC26-20260319C')
  })
  it('geeft het eerste beschikbare letter terug (niet op volgorde)', () => {
    expect(bepaalSplitNummer('ORD-001', ['ORD-001B', 'ORD-001A'])).toBe('ORD-001C')
  })
})
