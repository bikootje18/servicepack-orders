import { createClient } from '@/lib/supabase/server'
import type { Vracht, Levering, Order } from '@/types'

export function berekenVrachtBedrag(
  regels: { aantal_geleverd: number; tarief: number }[]
): number {
  const totaal = regels.reduce((sum, r) => sum + r.tarief * r.aantal_geleverd, 0)
  return Number(totaal.toFixed(2))
}

export async function getVrachten(): Promise<Vracht[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vrachten')
    .select('*, klant:klanten(naam), factuur:facturen(id, factuur_nummer, status, totaal_bedrag)')
    .eq('status', 'aangemaakt')
    .order('datum', { ascending: false })
  if (error) throw error
  return (data as any[]).map(v => ({
    ...v,
    factuur: Array.isArray(v.factuur) ? (v.factuur[0] ?? null) : v.factuur,
  })) as Vracht[]
}

const ARCHIEF_PAGE_SIZE = 50

export async function getVrachtenArchief(options?: {
  pagina?: number
  zoek?: string
}): Promise<{ vrachten: Vracht[]; totaal: number; pagina: number; paginas: number }> {
  const supabase = await createClient()
  const pagina = Math.max(1, options?.pagina ?? 1)
  const zoek = options?.zoek?.trim() ?? ''
  const from = (pagina - 1) * ARCHIEF_PAGE_SIZE
  const to = from + ARCHIEF_PAGE_SIZE - 1

  let klantIds: string[] | null = null
  if (zoek) {
    const { data: klanten, error: klantError } = await supabase
      .from('klanten')
      .select('id')
      .ilike('naam', `%${zoek}%`)
    if (klantError) throw klantError
    klantIds = klanten.map(k => k.id)
  }

  let query = supabase
    .from('vrachten')
    .select('*, klant:klanten(naam), factuur:facturen(id, factuur_nummer, status, totaal_bedrag)', { count: 'exact' })
    .eq('status', 'opgehaald')
    .order('datum', { ascending: false })
    .range(from, to)

  if (klantIds !== null) {
    query = klantIds.length > 0
      ? query.in('klant_id', klantIds) as typeof query
      : query.in('klant_id', ['00000000-0000-0000-0000-000000000000']) as typeof query // geen resultaten
  }

  const { data, error, count } = await query
  if (error) throw error

  const vrachten = (data as any[])
    .map(v => ({
      ...v,
      factuur: Array.isArray(v.factuur) ? (v.factuur[0] ?? null) : v.factuur,
    })) as Vracht[]

  const totaal = count ?? 0
  const paginas = Math.ceil(totaal / ARCHIEF_PAGE_SIZE)

  return { vrachten, totaal, pagina, paginas }
}

export async function countVrachtenArchief(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('vrachten')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'opgehaald')
  if (error) throw error
  return count ?? 0
}

export async function getVracht(id: string): Promise<Vracht> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vrachten')
    .select(`
      *,
      klant:klanten(*),
      regels:vracht_regels(
        *,
        levering:leveringen(
          *,
          order:orders(
            *,
            facturatie_code:facturatie_codes(*)
          )
        )
      ),
      factuur:facturen(id, factuur_nummer, status, totaal_bedrag, factuurdatum)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  // Supabase returns the factuur join as an array (one-to-many); normalize to single item
  const vracht = data as any
  return {
    ...vracht,
    factuur: Array.isArray(vracht.factuur) ? (vracht.factuur[0] ?? null) : vracht.factuur,
  } as Vracht
}

export async function getOngefactureerdeLeveringenVoorKlant(
  klantId: string
): Promise<(Levering & { order: Order & { facturatie_code: { tarief: number; code: string } } })[]> {
  const supabase = await createClient()

  // Get orders for this klant
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('klant_id', klantId)
  if (ordersError) throw ordersError
  const orderIds = orders.map(o => o.id)
  if (orderIds.length === 0) return []

  // Get all unfactured leveringen for these orders
  const { data: leveringen, error } = await supabase
    .from('leveringen')
    .select('*, order:orders(*, klant:klanten(naam), facturatie_code:facturatie_codes(tarief, code))')
    .in('order_id', orderIds)
    .is('factuur_id', null)
    .order('leverdatum')
  if (error) throw error

  if (leveringen.length === 0) return []

  // Get only the levering_ids from the above set that are already in a vracht
  const leveringIds = leveringen.map(l => l.id)
  const { data: inVracht, error: vrachtError } = await supabase
    .from('vracht_regels')
    .select('levering_id')
    .in('levering_id', leveringIds)
  if (vrachtError) throw vrachtError
  const inVrachtIds = new Set(inVracht.map(r => r.levering_id))

  return leveringen.filter(l => !inVrachtIds.has(l.id)) as (Levering & { order: Order & { facturatie_code: { tarief: number; code: string } } })[]
}

export async function splitLeveringVoorVracht(
  leveringId: string,
  aantalInVracht: number
): Promise<string> {
  const supabase = await createClient()

  const { data: levering, error } = await supabase
    .from('leveringen')
    .select('*')
    .eq('id', leveringId)
    .single()
  if (error) throw error

  if (aantalInVracht <= 0) throw new Error('Aantal moet groter zijn dan 0')
  if (aantalInVracht > levering.aantal_geleverd) throw new Error(`Maximaal ${levering.aantal_geleverd} beschikbaar`)

  // Geen split nodig als aantallen gelijk zijn
  if (aantalInVracht === levering.aantal_geleverd) return leveringId

  // Update origineel naar het gewenste aantal
  const { error: updateError } = await supabase
    .from('leveringen')
    .update({ aantal_geleverd: aantalInVracht })
    .eq('id', leveringId)
  if (updateError) throw updateError

  // Maak resterende deellevering aan
  const rest = levering.aantal_geleverd - aantalInVracht
  const { error: insertError } = await supabase
    .from('leveringen')
    .insert({
      order_id:        levering.order_id,
      aantal_geleverd: rest,
      leverdatum:      levering.leverdatum,
      notities:        levering.notities,
      tht:             levering.tht,
      aangemaakt_door: levering.aangemaakt_door,
    })
  if (insertError) throw insertError

  return leveringId
}

export async function createVracht(data: {
  klant_id: string
  datum: string
  notities: string
  levering_ids: string[]
  aantallen: Record<string, number>
  aflever_naam:     string | null
  aflever_adres:    string | null
  aflever_postcode: string | null
  aflever_stad:     string | null
  aflever_land:     string | null
  aangemaakt_door:  string | null
}): Promise<Vracht> {
  if (data.levering_ids.length === 0) throw new Error('levering_ids mag niet leeg zijn')

  const supabase = await createClient()

  // Split leveringen waar nodig
  const definitieveLeveringIds: string[] = []
  for (const leveringId of data.levering_ids) {
    const gewenstAantal = data.aantallen[leveringId]
    if (gewenstAantal) {
      const definitiefId = await splitLeveringVoorVracht(leveringId, gewenstAantal)
      definitieveLeveringIds.push(definitiefId)
    } else {
      definitieveLeveringIds.push(leveringId)
    }
  }

  const { data: vracht, error: vrachtError } = await supabase
    .from('vrachten')
    .insert({
      klant_id:         data.klant_id,
      datum:            data.datum,
      notities:         data.notities,
      aflever_naam:     data.aflever_naam     || null,
      aflever_adres:    data.aflever_adres    || null,
      aflever_postcode: data.aflever_postcode || null,
      aflever_stad:     data.aflever_stad     || null,
      aflever_land:     data.aflever_land     || null,
      aangemaakt_door:  data.aangemaakt_door,
    })
    .select()
    .single()
  if (vrachtError) throw vrachtError

  const regels = definitieveLeveringIds.map(levering_id => ({
    vracht_id: vracht.id,
    levering_id,
  }))

  const { error: regelsError } = await supabase
    .from('vracht_regels')
    .insert(regels)
  if (regelsError) throw regelsError

  return vracht as Vracht
}
