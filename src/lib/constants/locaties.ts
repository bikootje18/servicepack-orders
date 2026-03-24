export const LOCATIES = [
  { waarde: 'Lokkerdreef20', label: 'Lokkerdreef 20' },
  { waarde: 'Pauvreweg',     label: 'Pauvreweg' },
  { waarde: 'WVB',           label: 'WVB' },
] as const

export type Locatie = typeof LOCATIES[number]['waarde']

export function locatieLabel(waarde: string | null | undefined): string {
  return LOCATIES.find(l => l.waarde === waarde)?.label ?? waarde ?? '–'
}
