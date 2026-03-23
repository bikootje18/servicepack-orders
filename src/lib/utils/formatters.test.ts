import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatAantal } from './formatters'

describe('formatCurrency', () => {
  it('formats euros in Dutch locale', () => {
    expect(formatCurrency(1234.5)).toContain('1.234,50')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0,00')
  })
})

describe('formatDate', () => {
  it('formats date in Dutch format', () => {
    expect(formatDate('2026-03-23')).toBe('23-03-2026')
  })
})

describe('formatAantal', () => {
  it('formats integers with Dutch thousands separator', () => {
    expect(formatAantal(1000)).toBe('1.000')
  })
})
