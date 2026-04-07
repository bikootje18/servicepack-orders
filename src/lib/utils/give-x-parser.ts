export interface GiveXParseResult {
  documentnummer: string
  instructie_code: string
  leverdatum: Date | null
  totaal_hoeveelheid: number
  totaal_rollen: number | null
  heeft_rollen: boolean
}

function parseNLDate(s: string): Date | null {
  const match = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  const day = parseInt(d), month = parseInt(m), year = parseInt(y)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

export function parseGiveXRows(rows: string[][], bestandsnaam: string): GiveXParseResult {
  if (rows.length < 2) throw new Error(`${bestandsnaam}: onvoldoende rijen`)

  const headers = rows[0].map(h => h.trim())
  const heeft_rollen = headers.includes('Rollen')

  const docIdx = headers.indexOf('Documentnummer')
  if (docIdx === -1) throw new Error(`${bestandsnaam}: Documentnummer kolom niet gevonden`)

  // Datarijen: rijen waar kolom 0 (rijteller) gevuld is
  const dataRows = rows.slice(1).filter(row => row[0]?.trim())
  if (dataRows.length === 0) throw new Error(`${bestandsnaam}: geen datarijen gevonden`)

  const firstRow = dataRows[0]
  const documentnummer = firstRow[docIdx].trim()

  const instructieIdx = headers.indexOf('Instructie')
  if (instructieIdx === -1) throw new Error(`${bestandsnaam}: Instructie kolom niet gevonden`)

  const instructieRaw = firstRow[instructieIdx]?.trim()
  if (!instructieRaw) throw new Error(`${bestandsnaam}: Instructie waarde ontbreekt`)

  const instructie_code = instructieRaw.replaceAll('-', '')

  const leveringIdx = headers.indexOf('Levering OCC')
  const leveringRaw = leveringIdx >= 0 ? firstRow[leveringIdx]?.trim() ?? '' : ''
  const leverdatum = parseNLDate(leveringRaw)

  // Somrijen: Documentnummer is leeg maar rij heeft een gevulde cel
  const somRijen = rows.slice(1).filter(
    row => !row[0]?.trim() && row.some(cel => cel?.trim())
  )
  if (somRijen.length === 0) throw new Error(`${bestandsnaam}: somregel niet gevonden`)

  const somRij = somRijen[somRijen.length - 1]

  const hoeveelheidIdx = headers.indexOf('Hoeveelheid')
  if (hoeveelheidIdx === -1) throw new Error(`${bestandsnaam}: Hoeveelheid kolom niet gevonden`)

  const totaal_hoeveelheid = parseInt(somRij[hoeveelheidIdx]?.trim() ?? '')
  if (isNaN(totaal_hoeveelheid)) throw new Error(`${bestandsnaam}: ongeldige totaal hoeveelheid`)

  let totaal_rollen: number | null = null
  if (heeft_rollen) {
    const rollenIdx = headers.indexOf('Rollen')
    const rollenWaarde = somRij[rollenIdx]?.trim()
    totaal_rollen = rollenWaarde ? parseInt(rollenWaarde) : null
  }

  return { documentnummer, instructie_code, leverdatum, totaal_hoeveelheid, totaal_rollen, heeft_rollen }
}
