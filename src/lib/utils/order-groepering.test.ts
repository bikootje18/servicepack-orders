import { describe, it, expect } from 'vitest'
import { bepaalOrderGroep, groepeerOrders } from './order-groepering'
import type { OrderMetVrachten } from './order-groepering'

function maakOrder(overschrijf: Partial<OrderMetVrachten>): OrderMetVrachten {
  return {
    id: '1',
    order_nummer: 'ORD-001',
    order_code: 'TEST',
    order_grootte: 100,
    status: 'concept',
    deadline: null,
    vrachten: [],
    ...overschrijf,
  }
}

describe('bepaalOrderGroep', () => {
  it('concept → lopend', () => {
    expect(bepaalOrderGroep(maakOrder({ status: 'concept' }))).toBe('lopend')
  })

  it('bevestigd → lopend', () => {
    expect(bepaalOrderGroep(maakOrder({ status: 'bevestigd' }))).toBe('lopend')
  })

  it('in_behandeling → lopend', () => {
    expect(bepaalOrderGroep(maakOrder({ status: 'in_behandeling' }))).toBe('lopend')
  })

  it('geleverd zonder vrachten → lopend', () => {
    expect(bepaalOrderGroep(maakOrder({ status: 'geleverd', vrachten: [] }))).toBe('lopend')
  })

  it('geleverd met aangemaakt vracht → vracht_klaar', () => {
    expect(bepaalOrderGroep(maakOrder({
      status: 'geleverd',
      vrachten: [{ id: 'v1', vrachtbrief_nummer: 'VB-001', status: 'aangemaakt' }],
    }))).toBe('vracht_klaar')
  })

  it('geleverd met gemengde vrachten → vracht_klaar', () => {
    expect(bepaalOrderGroep(maakOrder({
      status: 'geleverd',
      vrachten: [
        { id: 'v1', vrachtbrief_nummer: 'VB-001', status: 'opgehaald' },
        { id: 'v2', vrachtbrief_nummer: 'VB-002', status: 'aangemaakt' },
      ],
    }))).toBe('vracht_klaar')
  })

  it('geleverd met alle vrachten opgehaald → opgehaald', () => {
    expect(bepaalOrderGroep(maakOrder({
      status: 'geleverd',
      vrachten: [{ id: 'v1', vrachtbrief_nummer: 'VB-001', status: 'opgehaald' }],
    }))).toBe('opgehaald')
  })

  it('gefactureerd → opgehaald', () => {
    expect(bepaalOrderGroep(maakOrder({ status: 'gefactureerd' }))).toBe('opgehaald')
  })
})

describe('groepeerOrders', () => {
  it('verdeelt orders correct over drie groepen', () => {
    const orders: OrderMetVrachten[] = [
      maakOrder({ id: '1', status: 'concept' }),
      maakOrder({ id: '2', status: 'geleverd', vrachten: [{ id: 'v1', vrachtbrief_nummer: 'VB-001', status: 'aangemaakt' }] }),
      maakOrder({ id: '3', status: 'geleverd', vrachten: [{ id: 'v2', vrachtbrief_nummer: 'VB-002', status: 'opgehaald' }] }),
    ]
    const groepen = groepeerOrders(orders)
    expect(groepen.lopend.map(o => o.id)).toEqual(['1'])
    expect(groepen.vracht_klaar.map(o => o.id)).toEqual(['2'])
    expect(groepen.opgehaald.map(o => o.id)).toEqual(['3'])
  })

  it('geeft lege arrays terug als groep geen orders heeft', () => {
    const groepen = groepeerOrders([])
    expect(groepen.lopend).toEqual([])
    expect(groepen.vracht_klaar).toEqual([])
    expect(groepen.opgehaald).toEqual([])
  })
})
