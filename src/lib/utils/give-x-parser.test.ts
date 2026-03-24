import { describe, it, expect } from 'vitest'
import { parseGiveXRows } from './give-x-parser'

const STANDAARD_HEADERS = [
  'Documentnummer', 'Artikelnummer', 'Klant artikelnummer',
  'Omschrijving op barcode', 'Barcode', 'Hoeveelheid',
  'Levering OCC', 'T.b.v. Order', 'Instructie', 'Geprod. SP',
]
const ROLLEN_HEADERS = [
  'Documentnummer', 'Artikelnummer', 'Omschrijving op barcode',
  'Barcode', 'Hoeveelheid', 'Rollen', 'Levering OCC',
  'T.b.v. Order', 'Instructie', 'Geprod. SP',
]

describe('parseGiveXRows', () => {
  it('parset een standaard bestand (zonder rollen)', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', '26-3-2026', 'order_55977_GBC', 'GIV00A-A', ''],
      ['20260326-GIV00A-A', '496011060', '', 'Omschrijving 2', '8718917669762', '30', '26-3-2026', 'order_55977_GBC', 'GIV00A-A', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '990', '', '', '', ''],
    ]
    const result = parseGiveXRows(rows, 'test.csv')
    expect(result.documentnummer).toBe('20260326-GIV00A-A')
    expect(result.instructie_code).toBe('GIV00AA')
    expect(result.totaal_hoeveelheid).toBe(990)
    expect(result.heeft_rollen).toBe(false)
    expect(result.totaal_rollen).toBeNull()
    expect(result.leverdatum).toEqual(new Date(2026, 2, 26))
  })

  it('parset een rollen-bestand', () => {
    const rows = [
      ROLLEN_HEADERS,
      ['20260326-GIV0RL-A', '318610059', 'Omschrijving', '8718917603703', '2000', '10', '26-3-2026', 'order_56106_Grand Ca', 'GIV0RL-A', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '2000', '10', '', '', '', ''],
    ]
    const result = parseGiveXRows(rows, 'test.csv')
    expect(result.instructie_code).toBe('GIV0RLA')
    expect(result.totaal_hoeveelheid).toBe(2000)
    expect(result.heeft_rollen).toBe(true)
    expect(result.totaal_rollen).toBe(10)
  })

  it('verwijdert het streepje uit de instructiecode', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', '26-3-2026', 'order_55977_GBC', 'GIV00A-A', ''],
      ['', '', '', '', '', '60', '', '', '', ''],
    ]
    expect(parseGiveXRows(rows, 'test.csv').instructie_code).toBe('GIV00AA')
  })

  it('geeft null leverdatum bij onparseerbare datum', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', 'geen-datum', 'order_55977_GBC', 'GIV00A-A', ''],
      ['', '', '', '', '', '60', '', '', '', ''],
    ]
    expect(parseGiveXRows(rows, 'test.csv').leverdatum).toBeNull()
  })

  it('gooit een fout bij ontbrekende Instructie waarde', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', '26-3-2026', 'order_55977_GBC', '', ''],
      ['', '', '', '', '', '60', '', '', '', ''],
    ]
    expect(() => parseGiveXRows(rows, 'test.csv')).toThrow()
  })

  it('gooit een fout bij ontbrekende Hoeveelheid in somregel', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', '26-3-2026', 'order_55977_GBC', 'GIV00A-A', ''],
      ['', '', '', '', '', '', '', '', '', ''],
    ]
    expect(() => parseGiveXRows(rows, 'test.csv')).toThrow()
  })

  it('gooit een fout bij onvoldoende rijen', () => {
    expect(() => parseGiveXRows([STANDAARD_HEADERS], 'test.csv')).toThrow()
  })
})
