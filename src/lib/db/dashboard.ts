import { createClient } from '@/lib/supabase/server'
import type { Order, Vracht } from '@/types'
import type { Locatie } from '@/lib/constants/locaties'

export type DeadlineKleur = 'rood' | 'oranje' | null

export function deadlineKleur(deadline: string | null | undefined): DeadlineKleur {
  if (!deadline) return null
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  const dagVerschil = Math.floor((d.getTime() - vandaag.getTime()) / 86400000)
  if (dagVerschil < 0) return 'rood'
  if (dagVerschil <= 1) return 'oranje'
  return null
}

export async function getOrdersPerLocatie(): Promise<Record<Locatie, { inBehandeling: Order[]; bevestigd: Order[] }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .in('status', ['in_behandeling', 'bevestigd'])
    .not('locatie', 'is', null)
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) throw error

  const result: Record<Locatie, { inBehandeling: Order[]; bevestigd: Order[] }> = {
    Lokkerdreef20: { inBehandeling: [], bevestigd: [] },
    Pauvreweg:     { inBehandeling: [], bevestigd: [] },
    WVB:           { inBehandeling: [], bevestigd: [] },
  }

  for (const order of data as Order[]) {
    const loc = order.locatie as Locatie
    if (!result[loc]) continue
    if (order.status === 'in_behandeling') result[loc].inBehandeling.push(order)
    else result[loc].bevestigd.push(order)
  }

  return result
}

export async function getVrachtenPerLocatie(): Promise<Record<Locatie, Vracht[]>> {
  const supabase = await createClient()
  const vandaag = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('vrachten')
    .select(`
      *,
      klant:klanten(naam),
      regels:vracht_regels(
        levering:leveringen(
          order:orders(locatie)
        )
      )
    `)
    .gte('datum', vandaag)
    .order('datum', { ascending: true })
  if (error) throw error

  const result: Record<Locatie, Vracht[]> = {
    Lokkerdreef20: [],
    Pauvreweg: [],
    WVB: [],
  }

  for (const vracht of data as any[]) {
    const locaties = new Set<Locatie>()
    for (const regel of vracht.regels ?? []) {
      const loc = regel.levering?.order?.locatie as Locatie | undefined
      if (loc && result[loc] !== undefined) locaties.add(loc)
    }
    for (const loc of locaties) {
      result[loc].push(vracht as Vracht)
    }
  }

  return result
}
