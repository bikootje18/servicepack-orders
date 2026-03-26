export interface VrachtInfo {
  id: string
  vrachtbrief_nummer: string
  status: 'aangemaakt' | 'opgehaald'
}

export interface OrderMetVrachten {
  id: string
  order_nummer: string
  order_code: string
  order_grootte: number
  status: string
  deadline: string | null
  vrachten: VrachtInfo[]
}

export interface OrderGroepen {
  lopend: OrderMetVrachten[]
  vracht_klaar: OrderMetVrachten[]
  opgehaald: OrderMetVrachten[]
}

export function bepaalOrderGroep(order: OrderMetVrachten): 'lopend' | 'vracht_klaar' | 'opgehaald' {
  if (['concept', 'bevestigd', 'in_behandeling'].includes(order.status)) return 'lopend'
  if (order.status === 'gefactureerd') return 'opgehaald'
  // geleverd
  if (order.vrachten.length === 0) return 'lopend'
  if (order.vrachten.every(v => v.status === 'opgehaald')) return 'opgehaald'
  return 'vracht_klaar'
}

export function groepeerOrders(orders: OrderMetVrachten[]): OrderGroepen {
  return {
    lopend: orders.filter(o => bepaalOrderGroep(o) === 'lopend'),
    vracht_klaar: orders.filter(o => bepaalOrderGroep(o) === 'vracht_klaar'),
    opgehaald: orders.filter(o => bepaalOrderGroep(o) === 'opgehaald'),
  }
}
