# Afdeling-view Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een aparte, minimale interface op `/locatie/[locatie]` voor afdeling-medewerkers die alleen orders van hun eigen locatie te zien krijgen, zonder klant- of facturatiegegevens, met een "Gereed melden" knop per order.

**Architecture:** Nieuwe Next.js route group `(locatie)` met eigen layout (geen sidebar). De bestaande `getOrdersPerLocatie` query wordt niet hergebruikt — er komt een gerichte query `getOrdersVoorLocatie` die één locatie ophaalt zonder klant- en facturatiedata. De view toont twee secties (in behandeling / aankomend) in een kaartjesraster. "Gereed melden" is een server action die de status naar `geleverd` zet.

**Tech Stack:** Next.js 15 App Router, Supabase SSR, Tailwind CSS, Vitest

---

## Bestandsoverzicht

| Bestand | Wat het doet |
|---------|-------------|
| `src/app/(locatie)/layout.tsx` | Minimale layout: auth check, geen sidebar, alleen witruimte |
| `src/app/(locatie)/locatie/[locatie]/page.tsx` | Server page: haalt data op, geeft 404 bij ongeldige locatie |
| `src/lib/db/locatie.ts` | `getOrdersVoorLocatie` + `isGeldigeLocatie` helper |
| `src/lib/db/locatie.test.ts` | Test voor `isGeldigeLocatie` |
| `src/lib/actions/locatie.ts` | `meldOrderGereed` server action |
| `src/components/locatie/LocatieOrderKaartje.tsx` | Groot kaartje: geen klant, met gereed-knop |
| `src/components/locatie/LocatieSecties.tsx` | Twee secties (in behandeling / aankomend) met kaartjesraster |

---

## Task 1: DB query + helper

**Files:**
- Create: `src/lib/db/locatie.ts`
- Create: `src/lib/db/locatie.test.ts`

- [ ] **Stap 1: Schrijf de falende test**

```ts
// src/lib/db/locatie.test.ts
import { describe, it, expect } from 'vitest'
import { isGeldigeLocatie } from './locatie'

describe('isGeldigeLocatie', () => {
  it('returns true for a valid locatie', () => {
    expect(isGeldigeLocatie('Pauvreweg')).toBe(true)
  })
  it('returns true for Lokkerdreef20', () => {
    expect(isGeldigeLocatie('Lokkerdreef20')).toBe(true)
  })
  it('returns false for an unknown locatie', () => {
    expect(isGeldigeLocatie('Onbekend')).toBe(false)
  })
  it('returns false for empty string', () => {
    expect(isGeldigeLocatie('')).toBe(false)
  })
})
```

- [ ] **Stap 2: Run de test, verwacht FAIL**

```bash
cd "/Users/biko/Documents/New Order System"
npx vitest run src/lib/db/locatie.test.ts
```

Verwacht: `Cannot find module './locatie'`

- [ ] **Stap 3: Schrijf de implementatie**

```ts
// src/lib/db/locatie.ts
import { createClient } from '@/lib/supabase/server'
import { LOCATIES, type Locatie } from '@/lib/constants/locaties'
import type { Order } from '@/types'

export function isGeldigeLocatie(waarde: string): waarde is Locatie {
  return LOCATIES.some(l => l.waarde === waarde)
}

export interface LocatieOrders {
  inBehandeling: Order[]
  bevestigd: Order[]
}

export async function getOrdersVoorLocatie(locatie: Locatie): Promise<LocatieOrders> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_nummer, order_code, omschrijving, bewerking, status, order_grootte, deadline, tht, locatie, aangemaakt_op')
    .in('status', ['in_behandeling', 'bevestigd'])
    .eq('locatie', locatie)
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
```

- [ ] **Stap 4: Run de test, verwacht PASS**

```bash
npx vitest run src/lib/db/locatie.test.ts
```

- [ ] **Stap 5: Commit**

```bash
git add src/lib/db/locatie.ts src/lib/db/locatie.test.ts
git commit -m "feat: getOrdersVoorLocatie query + isGeldigeLocatie helper"
```

---

## Task 2: Server action

**Files:**
- Create: `src/lib/actions/locatie.ts`

- [ ] **Stap 1: Schrijf de action**

```ts
// src/lib/actions/locatie.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function meldOrderGereed(orderId: string, locatie: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'geleverd' })
    .eq('id', orderId)
    .eq('status', 'in_behandeling') // alleen als het nog in behandeling is
  if (error) throw error
  revalidatePath(`/locatie/${locatie}`)
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/lib/actions/locatie.ts
git commit -m "feat: meldOrderGereed server action"
```

---

## Task 3: LocatieOrderKaartje component

**Files:**
- Create: `src/components/locatie/LocatieOrderKaartje.tsx`

- [ ] **Stap 1: Schrijf het component**

```tsx
// src/components/locatie/LocatieOrderKaartje.tsx
import type { Order } from '@/types'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate, formatAantal } from '@/lib/utils/formatters'
import { meldOrderGereed } from '@/lib/actions/locatie'

interface Props {
  order: Order
  locatie: string
}

const STATUS_LABEL: Record<string, string> = {
  in_behandeling: 'In behandeling',
  bevestigd: 'Aankomend',
}

export function LocatieOrderKaartje({ order, locatie }: Props) {
  const kleur = deadlineKleur(order.deadline)

  const accentKleur =
    kleur === 'rood'   ? '#ef4444' :
    kleur === 'oranje' ? '#f59e0b' :
                         '#e5e7eb'

  const deadlineStijl =
    kleur === 'rood'
      ? { backgroundColor: '#fef2f2', color: '#dc2626' }
      : kleur === 'oranje'
      ? { backgroundColor: '#fffbeb', color: '#b45309' }
      : { backgroundColor: '#f3f4f6', color: '#6b7280' }

  const statusKleur =
    order.status === 'in_behandeling' ? '#d97706' : '#2563eb'

  const kanGereedMelden = order.status === 'in_behandeling'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex">
        <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: accentKleur }} />
        <div className="flex-1 p-5">

          {/* Ordernummer + grootte */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="font-mono text-base font-bold text-gray-900">
              {order.order_nummer}
            </span>
            <span className="text-sm text-gray-400 tabular-nums flex-shrink-0">
              {formatAantal(order.order_grootte)} st.
            </span>
          </div>

          {/* Omschrijving */}
          {order.omschrijving && (
            <p className="text-sm text-gray-700 mb-1">{order.omschrijving}</p>
          )}

          {/* Bewerking */}
          {order.bewerking && (
            <p className="text-xs text-gray-400 mb-3">{order.bewerking}</p>
          )}

          {/* Status + deadline + THT */}
          <div className="flex items-center justify-between gap-2 mt-3">
            <span className="text-xs font-semibold" style={{ color: statusKleur }}>
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <div className="flex items-center gap-1.5">
              {order.deadline && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded" style={deadlineStijl}>
                  {formatDate(order.deadline)}
                </span>
              )}
              {order.tht && (
                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                  THT {formatDate(order.tht)}
                </span>
              )}
            </div>
          </div>

          {/* Gereed melden */}
          {kanGereedMelden && (
            <form
              action={async () => {
                'use server'
                await meldOrderGereed(order.id, locatie)
              }}
              className="mt-4"
            >
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
              >
                Gereed melden
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/locatie/LocatieOrderKaartje.tsx
git commit -m "feat: LocatieOrderKaartje component"
```

---

## Task 4: LocatieSecties component

**Files:**
- Create: `src/components/locatie/LocatieSecties.tsx`

- [ ] **Stap 1: Schrijf het component**

```tsx
// src/components/locatie/LocatieSecties.tsx
import type { LocatieOrders } from '@/lib/db/locatie'
import { LocatieOrderKaartje } from './LocatieOrderKaartje'

interface Props {
  orders: LocatieOrders
  locatie: string
}

export function LocatieSecties({ orders, locatie }: Props) {
  const { inBehandeling, bevestigd } = orders
  const leeg = inBehandeling.length === 0 && bevestigd.length === 0

  if (leeg) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-400 text-sm">Geen actieve orders voor deze locatie</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {inBehandeling.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-4">
            In behandeling — {inBehandeling.length}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inBehandeling.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </section>
      )}

      {bevestigd.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Aankomend — {bevestigd.length}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bevestigd.map(order => (
              <LocatieOrderKaartje key={order.id} order={order} locatie={locatie} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/locatie/LocatieSecties.tsx
git commit -m "feat: LocatieSecties layout component"
```

---

## Task 5: Layout + pagina

**Files:**
- Create: `src/app/(locatie)/layout.tsx`
- Create: `src/app/(locatie)/locatie/[locatie]/page.tsx`

- [ ] **Stap 1: Schrijf de layout**

```tsx
// src/app/(locatie)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { uitloggen } from '@/lib/actions/auth'

export default async function LocatieLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon-preview.png" alt="Service Pack" className="h-10 w-auto object-contain" />
        <form action={uitloggen}>
          <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Uitloggen
          </button>
        </form>
      </header>
      <main className="p-6 max-w-6xl mx-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Stap 2: Schrijf de pagina**

```tsx
// src/app/(locatie)/locatie/[locatie]/page.tsx
import { notFound } from 'next/navigation'
import { isGeldigeLocatie, getOrdersVoorLocatie } from '@/lib/db/locatie'
import { locatieLabel } from '@/lib/constants/locaties'
import { LocatieSecties } from '@/components/locatie/LocatieSecties'

export default async function LocatiePage({
  params,
}: {
  params: Promise<{ locatie: string }>
}) {
  const { locatie } = await params
  if (!isGeldigeLocatie(locatie)) notFound()

  const orders = await getOrdersVoorLocatie(locatie)
  const label = locatieLabel(locatie)

  const nu = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Productie
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
        </div>
        <p className="text-sm text-gray-400 capitalize pb-0.5">{nu}</p>
      </div>

      <LocatieSecties orders={orders} locatie={locatie} />
    </div>
  )
}
```

- [ ] **Stap 3: Test in de browser**

Ga naar `http://localhost:3000/locatie/Pauvreweg` — je ziet de orders van Pauvreweg zonder sidebar, zonder klantnamen.
Ga naar `http://localhost:3000/locatie/Onbekend` — je krijgt een 404.

- [ ] **Stap 4: Commit**

```bash
git add src/app/(locatie)/layout.tsx src/app/(locatie)/locatie/[locatie]/page.tsx
git commit -m "feat: afdeling-view route en layout op /locatie/[locatie]"
```

---

## Klaar

De afdeling-view staat live op `/locatie/[locatie]`. Volgende stap (apart plan): het permissiesysteem dat afdeling-gebruikers automatisch naar hun locatie doorstuurt en de rest van de app afschermt.
