export const LOCATIES = [
  { waarde: 'Lokkerdreef20',  label: 'Lokkerdreef',      dashboard: true  },
  { waarde: 'Pauvreweg',      label: 'Pauvreweg',        dashboard: true  },
  { waarde: 'WVB',            label: 'WVB',              dashboard: true  },
  { waarde: 'Darero',         label: 'Darero',           dashboard: false },
  { waarde: 'WVSEttenLeur',   label: 'WVS Etten-Leur',  dashboard: false },
  { waarde: 'WVSRoosendaal',  label: 'WVS Roosendaal',  dashboard: false },
  { waarde: 'Rotterdam',      label: 'Rotterdam',        dashboard: false },
  { waarde: 'Sittard',        label: 'Sittard',          dashboard: false },
  { waarde: 'Gilze',          label: 'Gilze',            dashboard: false },
] as const

export type Locatie = typeof LOCATIES[number]['waarde']

export function locatieLabel(waarde: string | null | undefined): string {
  return LOCATIES.find(l => l.waarde === waarde)?.label ?? waarde ?? '–'
}

export const DASHBOARD_LOCATIES = LOCATIES.filter(l => l.dashboard)
