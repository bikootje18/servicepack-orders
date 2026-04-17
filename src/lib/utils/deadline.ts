export type DeadlineKleur = 'rood' | 'oranje' | null

export function deadlineKleur(deadline: string | null | undefined): DeadlineKleur {
  if (!deadline) return null
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  const dagVerschil = Math.floor((d.getTime() - vandaag.getTime()) / 86400000)
  if (dagVerschil < 0) return 'rood'
  if (dagVerschil <= 2) return 'oranje'
  return null
}
