import { createClient } from '@/lib/supabase/server'
import type { Order } from '@/types'

export function validateOrder(data: {
  order_nummer: string
  order_code: string
  klant_id: string
  facturatie_code_id: string
  order_grootte: number
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.order_nummer.trim()) errors.order_nummer = 'Ordernummer is verplicht'
  if (!data.order_code.trim()) errors.order_code = 'Order code is verplicht'
  if (!data.klant_id) errors.klant_id = 'Klant is verplicht'
  if (!data.facturatie_code_id) errors.facturatie_code_id = 'Facturatie code is verplicht'
  if (!data.order_grootte || data.order_grootte <= 0) errors.order_grootte = 'Order grootte moet groter zijn dan 0'
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
  if (error) throw error
  return order
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
