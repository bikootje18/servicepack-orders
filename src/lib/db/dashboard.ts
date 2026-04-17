import { createClient } from '@/lib/supabase/server'
import type { Order, Vracht } from '@/types'
import { LOCATIES, type Locatie } from '@/lib/constants/locaties'
export type { DeadlineKleur } from '@/lib/utils/deadline'

export async function getOrdersPerLocatie(): Promise<Record<Locatie, { inBehandeling: Order[]; bevestigd: Order[] }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .in('status', ['in_behandeling', 'bevestigd'])
    .not('locatie', 'is', null)
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) throw error

  const result = Object.fromEntries(
    LOCATIES.map(l => [l.waarde, { inBehandeling: [] as Order[], bevestigd: [] as Order[] }])
  ) as Record<Locatie, { inBehandeling: Order[]; bevestigd: Order[] }>

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

  const result = Object.fromEntries(
    LOCATIES.map(l => [l.waarde, [] as Vracht[]])
  ) as Record<Locatie, Vracht[]>

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

export async function getOrdersOverigeLocaties(): Promise<{ inBehandeling: Order[]; bevestigd: Order[] }> {
  const supabase = await createClient()
  const overigeLocaties = LOCATIES.filter(l => !l.dashboard).map(l => l.waarde)

  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .in('status', ['in_behandeling', 'bevestigd'])
    .in('locatie', overigeLocaties)
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) throw error

  const inBehandeling: Order[] = []
  const bevestigd: Order[] = []

  for (const order of data as Order[]) {
    if (order.status === 'in_behandeling') inBehandeling.push(order)
    else bevestigd.push(order)
  }

  return { inBehandeling, bevestigd }
}
