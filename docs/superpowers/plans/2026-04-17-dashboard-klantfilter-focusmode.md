# Dashboard Klantfilter + Focus Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een klantfilter (searchable combobox) en een locatiekolom focus mode toe aan het bestaande productiedashboard.

**Architecture:** De dashboardpagina (server component) leest een `?klant=[id]` query parameter, filtert de orders op klant in de database, en geeft alle data als props door aan een nieuwe `DashboardGrid` client component. `DashboardGrid` beheert de focus state en rendert de kolommen. `LocatieKolom` wordt omgezet naar een client component zodat het click handlers kan ontvangen. `deadlineKleur` wordt verplaatst naar een aparte utils file zodat client components het veilig kunnen importeren (zonder server-only code mee te bundelen).

**Tech Stack:** Next.js 15 App Router, React server + client components, Supabase, Tailwind CSS, Vitest

---

## Bestandsoverzicht

| Actie | Bestand | Verantwoordelijkheid |
|-------|---------|---------------------|
| Nieuw | `src/lib/utils/deadline.ts` | Pure `deadlineKleur` functie (gedeeld tussen server en client) |
| Wijzig | `src/lib/db/dashboard.ts` | Importeer `deadlineKleur` uit nieuwe locatie; voeg `klantId?` filter toe |
| Wijzig | `src/lib/db/dashboard.test.ts` | Update import naar nieuwe `deadlineKleur` locatie |
| Wijzig | `src/components/dashboard/OrderKaartje.tsx` | Update import naar nieuwe `deadlineKleur` locatie |
| Wijzig | `src/components/dashboard/LocatieKolom.tsx` | Omzetten naar client component, `onClick` + `isFocused` prop toevoegen |
| Nieuw | `src/components/dashboard/DashboardGrid.tsx` | Client component: focus state + grid layout |
| Nieuw | `src/components/dashboard/KlantCombobox.tsx` | Client combobox met zoekfunctie (gebruik frontend-design skill) |
| Wijzig | `src/app/(app)/dashboard/page.tsx` | searchParams lezen, klanten fetchen, data naar DashboardGrid doorgeven |

---

## Task 1: Verplaats `deadlineKleur` naar een gedeeld utils bestand

`deadlineKleur` staat nu in `src/lib/db/dashboard.ts` — een bestand dat ook `createClient` importeert (server-only). Als `LocatieKolom` een client component wordt, kan het niet meer importeren uit `dashboard.ts`. Oplossing: verplaats de pure functie naar `src/lib/utils/deadline.ts`.

**Files:**
- Nieuw: `src/lib/utils/deadline.ts`
- Wijzig: `src/lib/db/dashboard.ts`
- Wijzig: `src/lib/db/dashboard.test.ts`
- Wijzig: `src/components/dashboard/OrderKaartje.tsx`
- Wijzig: `src/components/dashboard/LocatieKolom.tsx`

- [ ] **Stap 1: Maak `src/lib/utils/deadline.ts` aan**

```ts
export type DeadlineKleur = 'rood' | 'oranje' | null

export function deadlineKleur(deadline: string | null | undefined): DeadlineKleur {
  if (!deadline) return null
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  const dagVerschil = Math.floor((d.getTime() - vandaag.getTime()) / 86400000)
  if (dagVerschil < 0) return 'rood'
  if (dagVerschil <= 2) return 'oranje'
  return null
}
```

- [ ] **Stap 2: Update `src/lib/db/dashboard.ts`**

Verwijder de `DeadlineKleur` type definitie en `deadlineKleur` functie uit dit bestand. Voeg bovenaan de import toe:

```ts
import { deadlineKleur } from '@/lib/utils/deadline'
export type { DeadlineKleur } from '@/lib/utils/deadline'
```

Verwijder daarna de lokale definities van `DeadlineKleur` en `deadlineKleur`.

- [ ] **Stap 3: Update `src/lib/db/dashboard.test.ts`**

Vervang:
```ts
import { deadlineKleur } from './dashboard'
```
Met:
```ts
import { deadlineKleur } from '../utils/deadline'
```

- [ ] **Stap 4: Update `src/components/dashboard/OrderKaartje.tsx`**

Vervang:
```ts
import { deadlineKleur } from '@/lib/db/dashboard'
```
Met:
```ts
import { deadlineKleur } from '@/lib/utils/deadline'
```

- [ ] **Stap 5: Update `src/components/dashboard/LocatieKolom.tsx`**

Vervang:
```ts
import { deadlineKleur } from '@/lib/db/dashboard'
```
Met:
```ts
import { deadlineKleur } from '@/lib/utils/deadline'
```

- [ ] **Stap 6: Voer de tests uit en controleer dat ze slagen**

```bash
cd "/Users/biko/Documents/New Order System" && npx vitest run
```

Verwacht: alle bestaande `deadlineKleur` tests slagen.

- [ ] **Stap 7: Commit**

```bash
git add src/lib/utils/deadline.ts src/lib/db/dashboard.ts src/lib/db/dashboard.test.ts src/components/dashboard/OrderKaartje.tsx src/components/dashboard/LocatieKolom.tsx
git commit -m "refactor: verplaats deadlineKleur naar gedeeld utils bestand"
```

---

## Task 2: Voeg `klantId` filter toe aan de data-laag

**Files:**
- Wijzig: `src/lib/db/dashboard.ts`

- [ ] **Stap 1: Pas `getOrdersPerLocatie` aan**

Vervang de huidige signatuur en query:
```ts
export async function getOrdersPerLocatie(klantId?: string): Promise<Record<Locatie, { inBehandeling: Order[]; bevestigd: Order[] }>> {
  const supabase = await createClient()
  let query = supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .in('status', ['in_behandeling', 'bevestigd'])
    .not('locatie', 'is', null)
    .order('deadline', { ascending: true, nullsFirst: false })

  if (klantId) query = query.eq('klant_id', klantId)

  const { data, error } = await query
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
```

- [ ] **Stap 2: Pas `getOrdersOverigeLocaties` aan**

```ts
export async function getOrdersOverigeLocaties(klantId?: string): Promise<{ inBehandeling: Order[]; bevestigd: Order[] }> {
  const supabase = await createClient()
  const overigeLocaties = LOCATIES.filter(l => !l.dashboard).map(l => l.waarde)

  let query = supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .in('status', ['in_behandeling', 'bevestigd'])
    .in('locatie', overigeLocaties)
    .order('deadline', { ascending: true, nullsFirst: false })

  if (klantId) query = query.eq('klant_id', klantId)

  const { data, error } = await query
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

- [ ] **Stap 3: Commit**

```bash
git add src/lib/db/dashboard.ts
git commit -m "feat: klantId filter in getOrdersPerLocatie en getOrdersOverigeLocaties"
```

---

## Task 3: Zet LocatieKolom om naar client component

**Files:**
- Wijzig: `src/components/dashboard/LocatieKolom.tsx`

- [ ] **Stap 1: Zet `LocatieKolom.tsx` om naar client component met `onClick` prop**

Vervang de volledige inhoud van `src/components/dashboard/LocatieKolom.tsx`:

```tsx
'use client'

import type { Order, Vracht } from '@/types'
import { deadlineKleur } from '@/lib/utils/deadline'
import { formatDate } from '@/lib/utils/formatters'
import { OrderKaartje } from './OrderKaartje'

interface Props {
  label: string
  kleur: string
  inBehandeling: Order[]
  bevestigd: Order[]
  vrachten: Vracht[]
  toonLocatie?: boolean
  onClick?: () => void
  isFocused?: boolean
}

function vroegsteDeadline(orders: Order[]): string | null {
  return orders
    .map(o => o.deadline)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null
}

export function LocatieKolom({ label, kleur, inBehandeling, bevestigd, vrachten, toonLocatie, onClick, isFocused }: Props) {
  const totaalActief = inBehandeling.length
  const alleOrders = [...inBehandeling, ...bevestigd]
  const vroegste = vroegsteDeadline(alleOrders)
  const urgentie = vroegste ? deadlineKleur(vroegste) : null
  const isEmpty = alleOrders.length === 0 && vrachten.length === 0

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* Header — klikbaar voor focus mode */}
      <div
        className={`px-5 py-5 ${onClick ? 'cursor-pointer select-none' : ''}`}
        style={{ backgroundColor: kleur }}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white leading-tight">{label}</h2>
          <div className="flex items-center gap-2">
            {totaalActief > 0 && (
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                {totaalActief}
              </span>
            )}
            {isFocused && (
              <span
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                title="Klik om te sluiten"
              >
                ✕
              </span>
            )}
          </div>
        </div>

        {/* Subtekst in header */}
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {totaalActief === 0 && bevestigd.length === 0
              ? 'Geen orders'
              : [
                  totaalActief > 0 && `${totaalActief} actief`,
                  bevestigd.length > 0 && `${bevestigd.length} aankomend`,
                ].filter(Boolean).join(' · ')}
          </p>
          {vroegste && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: urgentie === 'rood' ? '#fef2f2' : urgentie === 'oranje' ? '#fffbeb' : 'rgba(255,255,255,0.2)',
                color: urgentie === 'rood' ? '#dc2626' : urgentie === 'oranje' ? '#92400e' : '#fff',
              }}
            >
              {formatDate(vroegste)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="bg-gray-50">
        {isEmpty ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">Niets gepland</p>
          </div>
        ) : (
          <>
            {/* In behandeling */}
            {inBehandeling.length > 0 && (
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: kleur }}>
                  In behandeling
                </p>
                <div className="flex flex-col gap-2.5">
                  {inBehandeling.map(order => (
                    <OrderKaartje key={order.id} order={order} toonLocatie={toonLocatie} />
                  ))}
                </div>
              </div>
            )}

            {/* Aankomend */}
            {bevestigd.length > 0 && (
              <div className={`p-4 ${inBehandeling.length > 0 ? 'border-t border-gray-200' : ''}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
                  Aankomend
                </p>
                <div className="flex flex-col gap-2.5">
                  {bevestigd.map(order => (
                    <OrderKaartje key={order.id} order={order} toonLocatie={toonLocatie} />
                  ))}
                </div>
              </div>
            )}

            {/* Vrachten */}
            {vrachten.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: kleur }}>
                  Uitgaande vrachten
                </p>
                <div className="flex flex-col gap-1.5">
                  {vrachten.map(vracht => (
                    <a
                      key={vracht.id}
                      href={`/vrachten/${vracht.id}`}
                      className="flex items-center justify-between gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-gray-800">
                          {vracht.vrachtbrief_nummer}
                        </span>
                        {vracht.klant && (
                          <span className="text-xs text-gray-400 truncate">{vracht.klant.naam}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                        {formatDate(vracht.datum)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/dashboard/LocatieKolom.tsx
git commit -m "feat: LocatieKolom als client component met onClick en isFocused props"
```

---

## Task 4: Maak `DashboardGrid` client component aan

Dit component beheert de focus state en rendert het grid. Het ontvangt alle data als props van de server page.

**Files:**
- Nieuw: `src/components/dashboard/DashboardGrid.tsx`

- [ ] **Stap 1: Maak `src/components/dashboard/DashboardGrid.tsx` aan**

```tsx
'use client'

import { useState } from 'react'
import type { Order, Vracht, Klant } from '@/types'
import { DASHBOARD_LOCATIES } from '@/lib/constants/locaties'
import { LocatieKolom } from './LocatieKolom'
import { KlantCombobox } from './KlantCombobox'

const KLEUREN = ['#2563eb', '#059669', '#7c3aed', '#6b7280'] as const

interface LocatieData {
  inBehandeling: Order[]
  bevestigd: Order[]
}

interface Props {
  orders: Record<string, LocatieData>
  vrachten: Record<string, Vracht[]>
  overigeOrders: LocatieData
  klanten: Pick<Klant, 'id' | 'naam'>[]
  geselecteerdeKlantId?: string
}

export function DashboardGrid({ orders, vrachten, overigeOrders, klanten, geselecteerdeKlantId }: Props) {
  const [focusLocatie, setFocusLocatie] = useState<string | null>(null)

  const handleFocus = (locatie: string) => {
    setFocusLocatie(prev => prev === locatie ? null : locatie)
  }

  const toonKolom = (locatie: string) => !focusLocatie || focusLocatie === locatie
  const isFocusMode = focusLocatie !== null

  return (
    <div>
      {/* Klantfilter combobox */}
      <div className="mb-6">
        <KlantCombobox
          klanten={klanten}
          geselecteerdeKlantId={geselecteerdeKlantId}
        />
      </div>

      {/* Grid */}
      <div className={isFocusMode ? 'grid grid-cols-1 gap-5 items-start' : 'grid grid-cols-4 gap-5 items-start'}>
        {DASHBOARD_LOCATIES.map((l, i) => {
          if (!toonKolom(l.waarde)) return null
          return (
            <LocatieKolom
              key={l.waarde}
              label={l.label}
              kleur={KLEUREN[i]}
              inBehandeling={orders[l.waarde]?.inBehandeling ?? []}
              bevestigd={orders[l.waarde]?.bevestigd ?? []}
              vrachten={vrachten[l.waarde] ?? []}
              onClick={() => handleFocus(l.waarde)}
              isFocused={focusLocatie === l.waarde}
            />
          )
        })}
        {toonKolom('overig') && (
          <LocatieKolom
            label="Overige locaties"
            kleur={KLEUREN[3]}
            inBehandeling={overigeOrders.inBehandeling}
            bevestigd={overigeOrders.bevestigd}
            vrachten={[]}
            toonLocatie
            onClick={() => handleFocus('overig')}
            isFocused={focusLocatie === 'overig'}
          />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/dashboard/DashboardGrid.tsx
git commit -m "feat: DashboardGrid client component met focus mode"
```

---

## Task 5: Maak `KlantCombobox` client component aan

**Gebruik de `frontend-design` skill** voor de volledige implementatie van dit component. Geef de skill de volgende context:

> "Maak een `KlantCombobox` component (`'use client'`) voor een Next.js 15 dashboard met Tailwind CSS. Props: `klanten: {id: string, naam: string}[]`, `geselecteerdeKlantId?: string`. Gedrag: typ om te filteren op naam (client-side, geen API calls), selecteer een klant → `router.push('?klant=[id]')`, klik 'Alle klanten' → `router.push('/dashboard')`. ~200 klanten. Sla op in `src/components/dashboard/KlantCombobox.tsx`."

**Files:**
- Nieuw: `src/components/dashboard/KlantCombobox.tsx`

- [ ] **Stap 1: Roep de `frontend-design` skill aan** met bovenstaande beschrijving

- [ ] **Stap 2: Verify dat het component de volgende interface exporteert**

```ts
interface Props {
  klanten: { id: string; naam: string }[]
  geselecteerdeKlantId?: string
}

export function KlantCombobox({ klanten, geselecteerdeKlantId }: Props)
```

- [ ] **Stap 3: Commit**

```bash
git add src/components/dashboard/KlantCombobox.tsx
git commit -m "feat: KlantCombobox met zoekfunctie en URL navigatie"
```

---

## Task 6: Update de DashboardPage server component

**Files:**
- Wijzig: `src/app/(app)/dashboard/page.tsx`

- [ ] **Stap 1: Vervang de volledige inhoud van `src/app/(app)/dashboard/page.tsx`**

```tsx
import { getOrdersPerLocatie, getVrachtenPerLocatie, getOrdersOverigeLocaties } from '@/lib/db/dashboard'
import { getKlanten } from '@/lib/db/klanten'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ klant?: string }>
}) {
  const { klant: klantId } = await searchParams

  const [orders, vrachten, overigeOrders, klanten] = await Promise.all([
    getOrdersPerLocatie(klantId),
    getVrachtenPerLocatie(),
    getOrdersOverigeLocaties(klantId),
    getKlanten(),
  ])

  const nu = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Productie</p>
          <h1 className="text-2xl font-bold text-gray-900">Locatie-overzicht</h1>
        </div>
        <p className="text-sm text-gray-400 capitalize pb-0.5">{nu}</p>
      </div>

      <DashboardGrid
        orders={orders}
        vrachten={vrachten}
        overigeOrders={overigeOrders}
        klanten={klanten.map(k => ({ id: k.id, naam: k.naam }))}
        geselecteerdeKlantId={klantId}
      />
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: dashboard pagina met klantfilter en DashboardGrid"
```

---

## Task 7: Handmatig testen

- [ ] Start de dev server: `npm run dev`
- [ ] Open het dashboard: controleer dat het bestaande overzicht ongewijzigd werkt
- [ ] Typ in de combobox: controleer dat klanten gefilterd worden
- [ ] Selecteer een klant: controleer dat de URL verandert naar `?klant=[id]` en dat alleen die klant's orders zichtbaar zijn
- [ ] Selecteer 'Alle klanten': controleer dat de URL teruggaat en alle orders zichtbaar zijn
- [ ] Klik op een kolomheader: controleer dat die kolom het volledige scherm inneemt
- [ ] Klik nogmaals op de header (of ✕): controleer dat het overzicht terugkeert
- [ ] Combineer: klantfilter + focus mode tegelijk
