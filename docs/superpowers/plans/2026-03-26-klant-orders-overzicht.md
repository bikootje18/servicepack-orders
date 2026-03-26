# Klant Orders Overzicht & Bewerken — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg aan de klant detailpagina een orders-overzicht toe in drie groepen (Lopend, Vracht klaar, Opgehaald) en een bewerkformulier voor klantgegevens.

**Architecture:** Pure groepeer-functies in een util (`order-groepering.ts`, testbaar), één DB query die orders met vrachtstatus ophaalt via leveringen, een Client Component voor het formulier-toggle, en een uitgebreide server component pagina.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), TypeScript, Tailwind, Vitest.

---

## File map

| Bestand | Actie | Verantwoordelijkheid |
|---------|-------|----------------------|
| `src/lib/utils/order-groepering.ts` | Aanmaken | Pure typen + functies voor groepering |
| `src/lib/utils/order-groepering.test.ts` | Aanmaken | Vitest tests voor groepering |
| `src/lib/db/orders.ts` | Aanpassen | Voeg `getOrdersVoorKlant` toe |
| `src/components/klanten/KlantBewerkFormulier.tsx` | Aanmaken | Client component: bewerk-knop + formulier toggle |
| `src/app/(app)/klanten/[id]/page.tsx` | Aanpassen | Voeg orders sectie + bewerk sectie toe |

---

### Task 1: Groepering utility (TDD)

**Files:**
- Create: `src/lib/utils/order-groepering.ts`
- Create: `src/lib/utils/order-groepering.test.ts`

- [ ] **Stap 1: Schrijf de tests EERST**

```typescript
// src/lib/utils/order-groepering.test.ts
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
```

- [ ] **Stap 2: Draai tests — verwacht FAIL**

```bash
npm run test -- order-groepering --run
```

Expected: FAIL — "cannot find module".

- [ ] **Stap 3: Schrijf de implementatie**

```typescript
// src/lib/utils/order-groepering.ts

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
```

- [ ] **Stap 4: Draai tests — verwacht PASS**

```bash
npm run test -- order-groepering --run
```

Expected: 9/9 groen.

- [ ] **Stap 5: Commit**

```bash
git add src/lib/utils/order-groepering.ts src/lib/utils/order-groepering.test.ts
git commit -m "feat: order groepering utility met tests"
```

---

### Task 2: DB query — orders per klant

**Files:**
- Modify: `src/lib/db/orders.ts`

Voeg onderaan het bestand toe, na de imports van `order-groepering`:

- [ ] **Stap 1: Voeg de import toe en schrijf de functie**

Voeg toe aan de imports bovenaan `src/lib/db/orders.ts`:

```typescript
import type { OrderMetVrachten, VrachtInfo } from '@/lib/utils/order-groepering'
```

Voeg toe onderaan het bestand:

```typescript
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
        (l.vracht_regels ?? [])
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
```

- [ ] **Stap 2: Draai alle tests**

```bash
npm run test:run
```

Expected: alle tests groen (geen regressies).

- [ ] **Stap 3: Commit**

```bash
git add src/lib/db/orders.ts
git commit -m "feat: getOrdersVoorKlant met vrachtstatus"
```

---

### Task 3: KlantBewerkFormulier component

**Files:**
- Create: `src/components/klanten/KlantBewerkFormulier.tsx`

- [ ] **Stap 1: Schrijf het component**

```tsx
// src/components/klanten/KlantBewerkFormulier.tsx
'use client'
import { useState } from 'react'
import type { Klant } from '@/types'

interface Props {
  klant: Klant
  bewerkAction: (formData: FormData) => Promise<void>
}

function formatAdres(klant: Klant): string {
  return [
    klant.adres,
    klant.postcode && klant.stad
      ? `${klant.postcode} ${klant.stad}`
      : klant.postcode || klant.stad,
    klant.land,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function KlantBewerkFormulier({ klant, bewerkAction }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{klant.naam}</h1>
          {formatAdres(klant) && (
            <p className="text-sm text-gray-500 mt-1">{formatAdres(klant)}</p>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Bewerken
        </button>
      </div>
    )
  }

  return (
    <form
      action={async (formData) => {
        await bewerkAction(formData)
        setOpen(false)
      }}
      className="mb-8 bg-white border border-gray-200 rounded-lg p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-gray-700">Klant bewerken</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Naam *</label>
        <input name="naam" defaultValue={klant.naam} required className="form-input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
        <input name="adres" defaultValue={klant.adres} className="form-input" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
          <input name="postcode" defaultValue={klant.postcode} className="form-input" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
          <input name="stad" defaultValue={klant.stad} className="form-input" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
        <input name="land" defaultValue={klant.land} className="form-input" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary">Opslaan</button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
          Annuleren
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Stap 2: Draai alle tests**

```bash
npm run test:run
```

Expected: alle tests groen.

- [ ] **Stap 3: Commit**

```bash
git add src/components/klanten/KlantBewerkFormulier.tsx
git commit -m "feat: KlantBewerkFormulier client component"
```

---

### Task 4: Klant detailpagina uitbreiden

**Files:**
- Modify: `src/app/(app)/klanten/[id]/page.tsx`

Vervang de volledige inhoud van het bestand:

- [ ] **Stap 1: Herschrijf de pagina**

```tsx
// src/app/(app)/klanten/[id]/page.tsx
import { getKlant, updateKlant } from '@/lib/db/klanten'
import { getGiveXImports } from '@/lib/db/give-x-imports'
import { getOrdersVoorKlant } from '@/lib/db/orders'
import { groepeerOrders } from '@/lib/utils/order-groepering'
import { ImportDropzone } from '@/components/give-x/ImportDropzone'
import { KlantBewerkFormulier } from '@/components/klanten/KlantBewerkFormulier'
import { notFound, redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import type { OrderMetVrachten } from '@/lib/utils/order-groepering'

const GIVE_X_NAAM_VARIANTEN = ['give-x', 'givex']

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klant = await getKlant(id).catch(() => null)
  if (!klant) notFound()

  const isGiveX = GIVE_X_NAAM_VARIANTEN.some(v => klant.naam.toLowerCase().includes(v))

  const [alleOrders, imports] = await Promise.all([
    getOrdersVoorKlant(id),
    isGiveX ? getGiveXImports(id) : Promise.resolve([]),
  ])

  const groepen = groepeerOrders(alleOrders)
  const ongematchteImports = imports.filter(i => !i.order_id)
  const gematchteImports = imports.filter(i => i.order_id)

  async function bewerkKlant(formData: FormData) {
    'use server'
    await updateKlant(id, {
      naam: formData.get('naam') as string,
      adres: formData.get('adres') as string,
      postcode: formData.get('postcode') as string,
      stad: formData.get('stad') as string,
      land: formData.get('land') as string,
    })
    revalidatePath(`/klanten/${id}`)
  }

  return (
    <div className="max-w-3xl">
      {/* Klantinfo + bewerken */}
      <KlantBewerkFormulier klant={klant} bewerkAction={bewerkKlant} />

      {/* Orders overzicht */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Orders</h2>

        {alleOrders.length === 0 && (
          <p className="text-sm text-gray-400">Nog geen orders voor deze klant.</p>
        )}

        <OrderGroepTabel titel="Lopend" orders={groepen.lopend} />
        <OrderGroepTabel titel="Vracht klaar" orders={groepen.vracht_klaar} />
        <OrderGroepTabel titel="Opgehaald" orders={groepen.opgehaald} />
      </section>

      {/* Give-X imports sectie */}
      {isGiveX && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Imports</h2>

          <ImportDropzone klantId={id} />

          {ongematchteImports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-amber-700 mb-2">
                Nog te koppelen ({ongematchteImports.length})
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left py-2 font-medium text-gray-600">Document</th>
                    <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
                    <th className="text-right py-2 font-medium text-gray-600">Stuks</th>
                  </tr>
                </thead>
                <tbody>
                  {ongematchteImports.map(imp => (
                    <tr key={imp.id} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-sm">{imp.instructie_code}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.documentnummer}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.leverdatum ?? '—'}</td>
                      <td className="py-2 text-right">{imp.totaal_hoeveelheid.toLocaleString('nl-NL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gematchteImports.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Verwerkt ({gematchteImports.length})
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-600">Code</th>
                    <th className="text-left py-2 font-medium text-gray-600">Order</th>
                    <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
                    <th className="text-right py-2 font-medium text-gray-600">Stuks</th>
                  </tr>
                </thead>
                <tbody>
                  {gematchteImports.map(imp => (
                    <tr key={imp.id} className="border-b border-gray-100">
                      <td className="py-2 font-mono text-sm">{imp.instructie_code}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.order?.order_nummer ?? '—'}</td>
                      <td className="py-2 text-gray-500 text-xs">{imp.leverdatum ?? '—'}</td>
                      <td className="py-2 text-right">{imp.totaal_hoeveelheid.toLocaleString('nl-NL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function OrderGroepTabel({ titel, orders }: { titel: string; orders: OrderMetVrachten[] }) {
  if (orders.length === 0) return null
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{titel} ({orders.length})</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-left py-2 font-medium text-gray-600">Code</th>
            <th className="text-right py-2 font-medium text-gray-600">Stuks</th>
            <th className="text-left py-2 font-medium text-gray-600">Deadline</th>
            <th className="text-left py-2 font-medium text-gray-600">Vracht</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 font-medium">
                <Link href={`/orders/${order.id}`} className="hover:underline">
                  {order.order_nummer}
                </Link>
              </td>
              <td className="py-2 text-gray-500 font-mono text-xs">{order.order_code}</td>
              <td className="py-2 text-right">{order.order_grootte.toLocaleString('nl-NL')}</td>
              <td className="py-2 text-gray-500 text-xs">{order.deadline ?? '—'}</td>
              <td className="py-2 text-gray-500 text-xs">
                {order.vrachten.length > 0
                  ? order.vrachten.map(v => v.vrachtbrief_nummer).join(', ')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Stap 2: Draai alle tests**

```bash
npm run test:run
```

Expected: alle tests groen.

- [ ] **Stap 3: Commit**

```bash
git add src/app/(app)/klanten/[id]/page.tsx
git commit -m "feat: klant detailpagina met orders overzicht en bewerk formulier"
```

---

## Done

Na Task 4 is de feature compleet:
- Klantgegevens bewerkbaar via knop + formulier
- Orders gegroepeerd in Lopend / Vracht klaar / Opgehaald
- Elke order klikbaar naar de order detailpagina
- Vrachtnummers zichtbaar per order
- Give-X imports sectie ongewijzigd aanwezig
