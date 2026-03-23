import { describe, it, expect } from 'vitest'
import { validateCode } from './codes'

describe('validateCode', () => {
  it('rejects empty code', () => {
    const errors = validateCode({ code: '', omschrijving: 'Test', tarief: 1 })
    expect(errors.code).toBeDefined()
  })
  it('rejects negative tarief', () => {
    const errors = validateCode({ code: 'abc', omschrijving: 'Test', tarief: -1 })
    expect(errors.tarief).toBeDefined()
  })
  it('accepts valid code', () => {
    const errors = validateCode({ code: 'abc_01', omschrijving: 'Test', tarief: 1.5 })
    expect(errors).toEqual({})
  })
})
