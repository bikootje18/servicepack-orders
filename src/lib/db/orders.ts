import { createClient } from '@/lib/supabase/server'
import type { Order } from '@/types'
import type { OrderMetVrachten, VrachtInfo } from '@/lib/utils/order-groepering'

export function validateOrder(data: {
  order_nummer: string
  order_code: string
  klant_id: string
  facturatie_code_id: string
  order_grootte: number
  locatie: string
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.order_nummer.trim()) errors.order_nummer = 'Ordernummer is verplicht'
  if (!data.order_code.trim()) errors.order_code = 'Order code is verplicht'
  if (!data.klant_id) errors.klant_id = 'Klant is verplicht'
  if (!data.facturatie_code_id) errors.facturatie_code_id = 'Facturatie code is verplicht'
  if (!data.order_grootte || data.order_grootte <= 0) errors.order_grootte = 'Order grootte moet groter zijn dan 0'
  if (!data.locatie) errors.locatie = 'Locatie is verplicht'
  return errors
}

export function berekenResterend(orderGrootte: number, totaalGeleverd: number): number {
  return Math.max(0, orderGrootte - totaalGeleverd)
}

export async function getOrders(
  page = 1,
  perPagina = 50,
  zoek?: string
): Promise<{ orders: Order[]; totaal: number }> {
  const supabase = await createClient()
  const van = (page - 1) * perPagina
  const tot = van + perPagina - 1

  let query = supabase
    .from('orders')
    .select('*, klant:klanten(id, naam), facturatie_code:facturatie_codes(id, code, tarief)', { count: 'exact' })
    .order('aangemaakt_op', { ascending: false })

  if (zoek && zoek.trim()) {
    query = query.or(`order_nummer.ilike.%${zoek}%,order_code.ilike.%${zoek}%`)
  }

  const { data, count, error } = await query.range(van, tot)
  if (error) throw error
  return { orders: data as Order[], totaal: count ?? 0 }
}

export async function getOrder(id: string): Promise<Order> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam), facturatie_code:facturatie_codes(id, code, omschrijving, tarief)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Order
}

export async function zoekOrdersVoorKloon(zoekterm: string): Promise<Order[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .or(`order_code.ilike.%${zoekterm}%,klanten.naam.ilike.%${zoekterm}%`)
    .order('aangemaakt_op', { ascending: false })
    .limit(20)
  if (error) throw error
  return data as Order[]
}

export async function createOrder(data: Omit<Order, 'id' | 'status' | 'aangemaakt_op' | 'klant' | 'facturatie_code'>): Promise<Order> {
  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .insert({ ...data, status: 'concept' })
    .select()
    .single()
  if (error) throw new Error(`[createOrder] ${error.message} (code: ${error.code})`)
  return order
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update(data)
    .eq('id', id)
  if (error) throw new Error(`[updateOrder] ${error.message} (code: ${error.code})`)
}

export async function deleteOrder(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`[deleteOrder] ${error.message} (code: ${error.code})`)
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

export async function getOrdersVoorKlant(klantId: string): Promise<OrderMetVrachten[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_nummer, order_code, order_grootte, status, deadline,
      leveringen(
        vracht_regels(
          vracht:vrachten(id, vrachtbrief_nummer, status)
        )
      )
    `)
    .eq('klant_id', klantId)
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) throw error

  return (data ?? []).map(order => {
    const alleVrachten = (order.leveringen ?? [])
      .flatMap((l: any) =>
        [].concat(l.vracht_regels ?? [])
          .map((vr: any) => vr.vracht)
          .filter(Boolean)
      )
    // Dedupliceer op id
    const vrachten = Array.from(
      new Map(alleVrachten.map((v: any) => [v.id, v])).values()
    ) as VrachtInfo[]

    return {
      id: order.id,
      order_nummer: order.order_nummer,
      order_code: order.order_code,
      order_grootte: order.order_grootte,
      status: order.status,
      deadline: order.deadline,
      vrachten,
    }
  })
}
