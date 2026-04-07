// src/lib/db/artikelen.ts
import { createClient } from '@/lib/supabase/server'
import type { OrderArtikel } from '@/types'

export async function getArtikelenVoorOrder(orderId: string): Promise<OrderArtikel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_artikelen')
    .select('*')
    .eq('order_id', orderId)
    .order('volgorde', { ascending: true })
  if (error) throw new Error(`[getArtikelenVoorOrder] ${error.message} (code: ${error.code})`)
  return (data ?? []) as OrderArtikel[]
}

export async function getLaatsteArtikelenVoorKlant(klantId: string): Promise<OrderArtikel[]> {
  const supabase = await createClient()

  // Haal de laatste 20 orders op voor deze klant, inclusief hun artikelen
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_artikelen(*)')
    .eq('klant_id', klantId)
    .order('aangemaakt_op', { ascending: false })
    .limit(20)
  if (error) throw error

  // Zoek de meest recente order met minimaal één artikel
  for (const order of (orders ?? [])) {
    const artikelen = (order.order_artikelen ?? []) as OrderArtikel[]
    if (artikelen.length > 0) {
      return artikelen.sort((a, b) => a.volgorde - b.volgorde)
    }
  }
  return []
}

export async function saveArtikelen(
  orderId: string,
  regels: Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }>
): Promise<void> {
  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('order_artikelen')
    .delete()
    .eq('order_id', orderId)
  if (deleteError) throw new Error(`[saveArtikelen delete] ${deleteError.message} (code: ${deleteError.code})`)

  if (regels.length === 0) return

  const { error: insertError } = await supabase
    .from('order_artikelen')
    .insert(
      regels.map((r, i) => ({
        order_id: orderId,
        naam: r.naam,
        berekening_type: r.berekening_type,
        factor: r.factor,
        volgorde: i,
      }))
    )
  if (insertError) throw new Error(`[saveArtikelen insert] ${insertError.message} (code: ${insertError.code})`)
}
