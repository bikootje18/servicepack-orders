# Locatie, Deadline, THT & Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg locatie, deadline en THT toe aan orders/leveringen, en bouw een management dashboard met drie locatiekolommen.

**Architecture:** Twee parallelle tracks na de migratie. Track 1 voegt nieuwe velden toe aan bestaande formulieren en detailpagina's. Track 2 bouwt het dashboard met de frontend-design skill. Beide tracks delen de migratie en de types-update als fundament.

**Tech Stack:** Next.js 15 App Router, Supabase, Tailwind CSS, Vitest, TypeScript. Server Actions voor mutaties (inline `'use server'` in page-componenten). Client components voor interactieve formulieren.

---

## Bestandsstructuur

**Nieuwe bestanden:**
- `supabase/migrations/007_locatie_deadline_tht.sql` — DB migratie
- `src/lib/constants/locaties.ts` — Vaste locatielijst (één definitie, overal hergebruikt)
- `src/lib/db/dashboard.ts` — Query: orders + vrachten per locatie
- `src/lib/db/dashboard.test.ts` — Tests voor dashboard logica
- `src/app/(app)/dashboard/page.tsx` — Dashboard pagina
- `src/components/dashboard/LocatieKolom.tsx` — Kolom per locatie
- `src/components/dashboard/OrderKaartje.tsx` — Order kaartje met deadline-markering

**Gewijzigde bestanden:**
- `src/types/index.ts` — Voeg `locatie`, `deadline`, `tht` toe aan `Order`; `tht` aan `Levering`
- `src/lib/db/orders.ts` — `validateOrder` vereist nu `locatie`
- `src/lib/db/orders.test.ts` — Test voor locatie-validatie
- `src/lib/db/leveringen.ts` — `createLevering` accepteert optionele `tht`
- `src/lib/db/leveringen.test.ts` — Test voor tht-veld (geen validatielogica, alleen typedekking)
- `src/lib/actions/leveringen.ts` — Doorsturen van `tht` naar `createLevering`
- `src/app/(app)/orders/nieuw/page.tsx` — Drie nieuwe velden in formulier + Server Action
- `src/app/(app)/orders/[id]/bewerken/page.tsx` — Drie nieuwe velden in formulier + Server Action
- `src/app/(app)/orders/[id]/page.tsx` — Toon locatie/deadline/tht in detailpagina
- `src/components/leveringen/LeveringForm.tsx` — Optioneel tht-veld
- `src/components/leveringen/LeveringenList.tsx` — Toon tht-kolom
- `src/app/(app)/layout.tsx` — Dashboard link in navigatie

---

## TRACK 0: Fundament (eerst uitvoeren)

### Task 1: Database migratie

**Files:**
- Create: `supabase/migrations/007_locatie_deadline_tht.sql`

- [ ] **Stap 1: Schrijf de migratie**

```sql
-- Voeg locatie, deadline en tht toe aan orders
ALTER TABLE orders
  ADD COLUMN locatie text CHECK (locatie IN ('Lokkerdreef20', 'Pauvreweg', 'WVB')),
  ADD COLUMN deadline date,
  ADD COLUMN tht date;

-- Voeg tht toe aan leveringen (afwijkende tht per levering)
ALTER TABLE leveringen
  ADD COLUMN tht date;
```

- [ ] **Stap 2: Voer de migratie uit**

```bash
npx supabase db push
```

Expected: migratie succesvol, geen errors.

- [ ] **Stap 3: Commit**

```bash
git add supabase/migrations/007_locatie_deadline_tht.sql
git commit -m "feat: migratie locatie/deadline/tht op orders en leveringen"
```

---

### Task 2: Locatieconstanten + Types

**Files:**
- Create: `src/lib/constants/locaties.ts`
- Modify: `src/types/index.ts`

- [ ] **Stap 1: Maak de constants file aan**

```typescript
// src/lib/constants/locaties.ts
export const LOCATIES = [
  { waarde: 'Lokkerdreef20', label: 'Lokkerdreef 20' },
  { waarde: 'Pauvreweg',     label: 'Pauvreweg' },
  { waarde: 'WVB',           label: 'WVB' },
] as const

export type Locatie = typeof LOCATIES[number]['waarde']

export function locatieLabel(waarde: string | null | undefined): string {
  return LOCATIES.find(l => l.waarde === waarde)?.label ?? waarde ?? '–'
}
```

- [ ] **Stap 2: Voeg velden toe aan `Order` en `Levering` in `src/types/index.ts`**

In de `Order` interface, voeg toe na `aangemaakt_op`:
```typescript
  locatie: string | null
  deadline: string | null
  tht: string | null
```

In de `Levering` interface, voeg toe na `aangemaakt_op`:
```typescript
  tht: string | null
```

> **Type-opmerking:** `locatie` is `string | null` (niet `string`). De enige call site voor `createOrder` is in `/orders/nieuw/page.tsx` (Task 4), die wordt bijgewerkt om `locatie` mee te geven. Er zijn geen andere `createOrder` aanroepen in de codebase.

- [ ] **Stap 3: Draai tests om te controleren dat niets breekt**

```bash
npm run test:run
```

Expected: alle bestaande tests groen.

- [ ] **Stap 4: Commit**

```bash
git add src/lib/constants/locaties.ts src/types/index.ts
git commit -m "feat: voeg locatie/deadline/tht toe aan types en locatieconstanten"
```

---

## TRACK 1: Formulieren & Detailpagina's

*(Na Task 1 en Task 2)*

### Task 3: Validatie update + tests

**Files:**
- Modify: `src/lib/db/orders.ts`
- Modify: `src/lib/db/orders.test.ts`

- [ ] **Stap 1: Schrijf de falende test**

Voeg toe aan `src/lib/db/orders.test.ts`:
```typescript
it('rejects missing locatie', () => {
  const errors = validateOrder({ ...base, locatie: '' })
  expect(errors.locatie).toBeDefined()
})

it('accepts valid locatie', () => {
  const errors = validateOrder({ ...base, locatie: 'Pauvreweg' })
  expect(errors.locatie).toBeUndefined()
})
```

- [ ] **Stap 2: Draai de test om te zien dat ze falen**

```bash
npm run test:run -- orders.test.ts
```

Expected: FAIL — `locatie` wordt nog niet gevalideerd.

- [ ] **Stap 3: Update `validateOrder` in `src/lib/db/orders.ts`**

Voeg `locatie` toe aan het parameter type en de validatielogica:
```typescript
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
```

- [ ] **Stap 4: Draai tests**

```bash
npm run test:run -- orders.test.ts
```

Expected: PASS.

- [ ] **Stap 5: Commit**

```bash
git add src/lib/db/orders.ts src/lib/db/orders.test.ts
git commit -m "feat: valideer locatie in validateOrder"
```

---

### Task 4: Nieuw order formulier

**Files:**
- Modify: `src/app/(app)/orders/nieuw/page.tsx`

- [ ] **Stap 1: Update de Server Action `slaOrderOp`**

Voeg locatie/deadline/tht toe aan de `createOrder` aanroep in de Server Action. Voeg ook server-side validatie toe voor `locatie`:

```typescript
async function slaOrderOp(formData: FormData) {
  'use server'
  const locatie = formData.get('locatie') as string
  if (!locatie) throw new Error('Locatie is verplicht')
  const codeText = (formData.get('facturatie_code') as string ?? '').trim()
  const gevondenCode = await getCodeByCode(codeText)
  if (!gevondenCode) throw new Error(`Facturatie code '${codeText}' niet gevonden`)
  const order = await createOrder({
    order_nummer: formData.get('order_nummer') as string,
    order_code: formData.get('order_code') as string,
    klant_id: formData.get('klant_id') as string,
    facturatie_code_id: gevondenCode.id,
    order_grootte: parseInt(formData.get('order_grootte') as string),
    aantal_per_doos: parseInt(formData.get('aantal_per_doos') as string) || 0,
    aantal_per_inner: parseInt(formData.get('aantal_per_inner') as string) || 0,
    aantal_per_pallet: parseInt(formData.get('aantal_per_pallet') as string) || 0,
    bewerking: formData.get('bewerking') as string || '',
    opwerken: formData.get('opwerken') === 'on',
    omschrijving: formData.get('omschrijving') as string || '',
    locatie,
    deadline: formData.get('deadline') as string || null,
    tht: formData.get('tht') as string || null,
    aangemaakt_door: null,
  })
  redirect(`/orders/${order.id}?print=1`)
}
```

- [ ] **Stap 2: Voeg de drie velden toe aan het formulier**

Voeg bovenaan de bestaande imports toe:
```typescript
import { LOCATIES } from '@/lib/constants/locaties'
```

Voeg na het "Order grootte" veld toe (vóór de doos/inner/pallet velden):
```tsx
<div className="grid grid-cols-3 gap-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Locatie *</label>
    <select name="locatie" required defaultValue={v?.locatie ?? ''}
      className="form-select">
      <option value="">Selecteer locatie...</option>
      {LOCATIES.map(l => <option key={l.waarde} value={l.waarde}>{l.label}</option>)}
    </select>
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
    <input name="deadline" type="date" defaultValue={v?.deadline ?? ''}
      className="form-input" />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">THT</label>
    <input name="tht" type="date" defaultValue={v?.tht ?? ''}
      className="form-input" />
  </div>
</div>
```

- [ ] **Stap 3: Handmatig testen — maak een nieuwe order aan met locatie/deadline/tht**

Start de dev server: `npm run dev`
Navigeer naar `/orders/nieuw`, maak een order aan met alle drie velden ingevuld. Controleer in Supabase of de waarden opgeslagen zijn.

- [ ] **Stap 4: Commit**

```bash
git add src/app/\(app\)/orders/nieuw/page.tsx
git commit -m "feat: locatie/deadline/tht velden in nieuw order formulier"
```

---

### Task 5: Order bewerken formulier

**Files:**
- Modify: `src/app/(app)/orders/[id]/bewerken/page.tsx`

- [ ] **Stap 1: Update de Server Action `slaOpgeslagenOp`**

Voeg locatie/deadline/tht toe aan `updateOrder`, inclusief server-side validatie:

```typescript
async function slaOpgeslagenOp(formData: FormData) {
  'use server'
  const locatie = formData.get('locatie') as string
  if (!locatie) throw new Error('Locatie is verplicht')
  const codeText = (formData.get('facturatie_code') as string ?? '').trim()
  const gevondenCode = await getCodeByCode(codeText)
  if (!gevondenCode) throw new Error(`Facturatie code '${codeText}' niet gevonden`)
  await updateOrder(id, {
    order_nummer: formData.get('order_nummer') as string,
    order_code: formData.get('order_code') as string,
    klant_id: formData.get('klant_id') as string,
    facturatie_code_id: gevondenCode.id,
    order_grootte: parseInt(formData.get('order_grootte') as string),
    aantal_per_doos: parseInt(formData.get('aantal_per_doos') as string) || 0,
    aantal_per_inner: parseInt(formData.get('aantal_per_inner') as string) || 0,
    aantal_per_pallet: parseInt(formData.get('aantal_per_pallet') as string) || 0,
    bewerking: formData.get('bewerking') as string || '',
    opwerken: formData.get('opwerken') === 'on',
    omschrijving: formData.get('omschrijving') as string || '',
    locatie,
    deadline: formData.get('deadline') as string || null,
    tht: formData.get('tht') as string || null,
  })
  redirect(`/orders/${id}`)
}
```

- [ ] **Stap 2: Voeg de drie velden toe aan het formulier**

Zelfde imports en velden als Task 4, maar met `defaultValue={order.locatie ?? ''}`, `defaultValue={order.deadline ?? ''}`, `defaultValue={order.tht ?? ''}`.

- [ ] **Stap 3: Commit**

```bash
git add src/app/\(app\)/orders/\[id\]/bewerken/page.tsx
git commit -m "feat: locatie/deadline/tht velden in order bewerken formulier"
```

---

### Task 6: Order detailpagina

**Files:**
- Modify: `src/app/(app)/orders/[id]/page.tsx`

- [ ] **Stap 1: Voeg import toe**

```typescript
import { locatieLabel } from '@/lib/constants/locaties'
```

- [ ] **Stap 2: Voeg locatie/deadline/tht toe aan het info-grid**

In het bestaande grid (`grid grid-cols-2 gap-3 text-sm`), voeg toe na de bestaande `<div>` elementen:

```tsx
{order.locatie && (
  <div><span className="text-gray-500">Locatie:</span> <strong>{locatieLabel(order.locatie)}</strong></div>
)}
{order.deadline && (
  <div><span className="text-gray-500">Deadline:</span> <strong>{formatDate(order.deadline)}</strong></div>
)}
{order.tht && (
  <div><span className="text-gray-500">THT:</span> <strong>{formatDate(order.tht)}</strong></div>
)}
```

- [ ] **Stap 3: Commit**

```bash
git add src/app/\(app\)/orders/\[id\]/page.tsx
git commit -m "feat: toon locatie/deadline/tht op order detailpagina"
```

---

### Task 7: Leveringformulier + leveringenlijst

**Files:**
- Modify: `src/components/leveringen/LeveringForm.tsx`
- Modify: `src/components/leveringen/LeveringenList.tsx`
- Modify: `src/lib/db/leveringen.ts`
- Modify: `src/lib/actions/leveringen.ts`

- [ ] **Stap 1: Update `createLevering` in `src/lib/db/leveringen.ts`**

Voeg `tht` toe aan het data-parameter type:
```typescript
export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  tht?: string | null
  aangemaakt_door: string | null
}): Promise<Levering> {
```

- [ ] **Stap 2: Update beide server actions in `src/lib/actions/leveringen.ts`**

`createLevering`:
```typescript
export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  tht?: string | null
  aangemaakt_door: string | null
}): Promise<void> {
  await dbCreateLevering(data)
  revalidatePath(`/orders/${data.order_id}`)
}
```

`gereedmeldenEnVrachtAanmaken` (ook in `src/lib/actions/leveringen.ts`):
```typescript
export async function gereedmeldenEnVrachtAanmaken(data: {
  order_id: string
  klant_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  tht?: string | null
}): Promise<void> {
  const levering = await dbCreateLevering({
    order_id: data.order_id,
    aantal_geleverd: data.aantal_geleverd,
    leverdatum: data.leverdatum,
    notities: data.notities,
    tht: data.tht ?? null,
    aangemaakt_door: null,
  })
  // rest blijft hetzelfde
  const vracht = await createVracht({ ... })
  await dbCreateFactuur(vracht.id)
  redirect(`/vrachten/${vracht.id}/klaar`)
}
```

- [ ] **Stap 3: Update `LeveringForm.tsx` — voeg tht-veld toe**

Voeg `tht` toe aan het `leesFormulier` type en destructuring. Voeg het veld toe na de notities-input:

```tsx
<div>
  <label className="block text-xs font-medium text-gray-700 mb-1">THT (afwijkend)</label>
  <input name="tht" type="date" className="form-input" />
</div>
```

Update het grid naar `grid-cols-4` om het extra veld te accommoderen.

Update `handleOpslaan` en `handleSnelVracht` om `tht` door te geven aan de server action:
```typescript
const tht = formData.get('tht') as string || null
// pass tht in the createLevering / gereedmeldenEnVrachtAanmaken calls
```

- [ ] **Stap 4: Update `LeveringenList.tsx` — toon tht-kolom**

Voeg `tht` toe aan de tabel: nieuwe kolom header "THT" en cel `{l.tht ? formatDate(l.tht) : '–'}`.

- [ ] **Stap 5: Draai tests**

```bash
npm run test:run
```

Expected: alles groen.

- [ ] **Stap 6: Commit**

```bash
git add src/lib/db/leveringen.ts src/lib/actions/leveringen.ts src/components/leveringen/LeveringForm.tsx src/components/leveringen/LeveringenList.tsx
git commit -m "feat: optionele THT per levering in formulier en lijst"
```

---

## TRACK 2: Dashboard

*(Na Task 1 en Task 2 — parallel aan Track 1)*

### Task 8: Dashboard data query

**Files:**
- Create: `src/lib/db/dashboard.ts`
- Create: `src/lib/db/dashboard.test.ts`

- [ ] **Stap 1: Schrijf de test voor `deadlineKleur`**

```typescript
// src/lib/db/dashboard.test.ts
import { describe, it, expect } from 'vitest'
import { deadlineKleur } from './dashboard'

describe('deadlineKleur', () => {
  it('returns "rood" for a past deadline', () => {
    expect(deadlineKleur('2020-01-01')).toBe('rood')
  })
  it('returns "oranje" for today', () => {
    const vandaag = new Date().toISOString().split('T')[0]
    expect(deadlineKleur(vandaag)).toBe('oranje')
  })
  it('returns "oranje" for tomorrow', () => {
    const morgen = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    expect(deadlineKleur(morgen)).toBe('oranje')
  })
  it('returns null for a far-future deadline', () => {
    expect(deadlineKleur('2099-12-31')).toBeNull()
  })
  it('returns null for null deadline', () => {
    expect(deadlineKleur(null)).toBeNull()
  })
})
```

- [ ] **Stap 2: Draai de test om te zien dat ze falen**

```bash
npm run test:run -- dashboard.test.ts
```

Expected: FAIL — module bestaat nog niet.

- [ ] **Stap 3: Maak `src/lib/db/dashboard.ts` aan**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Order, Vracht } from '@/types'
import type { Locatie } from '@/lib/constants/locaties'

export type DeadlineKleur = 'rood' | 'oranje' | null

export function deadlineKleur(deadline: string | null | undefined): DeadlineKleur {
  if (!deadline) return null
  const vandaag = new Date()
  vandaag.setHours(0, 0, 0, 0)
  const d = new Date(deadline)
  d.setHours(0, 0, 0, 0)
  const dagVerschil = Math.floor((d.getTime() - vandaag.getTime()) / 86400000)
  if (dagVerschil < 0) return 'rood'
  if (dagVerschil <= 1) return 'oranje'
  return null
}

export async function getOrdersPerLocatie(): Promise<Record<Locatie, { inBehandeling: Order[]; bevestigd: Order[] }>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .in('status', ['in_behandeling', 'bevestigd'])
    .not('locatie', 'is', null)
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) throw error

  const result = {
    Lokkerdreef20: { inBehandeling: [] as Order[], bevestigd: [] as Order[] },
    Pauvreweg:     { inBehandeling: [] as Order[], bevestigd: [] as Order[] },
    WVB:           { inBehandeling: [] as Order[], bevestigd: [] as Order[] },
  }

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

  const result: Record<Locatie, Vracht[]> = {
    Lokkerdreef20: [],
    Pauvreweg: [],
    WVB: [],
  }

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
```

- [ ] **Stap 4: Draai de tests**

```bash
npm run test:run -- dashboard.test.ts
```

Expected: PASS.

- [ ] **Stap 5: Commit**

```bash
git add src/lib/db/dashboard.ts src/lib/db/dashboard.test.ts
git commit -m "feat: dashboard data queries (orders + vrachten per locatie)"
```

---

### Task 9: Dashboard pagina en componenten

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/components/dashboard/LocatieKolom.tsx`
- Create: `src/components/dashboard/OrderKaartje.tsx`

> **⚠️ GEBRUIK DE `frontend-design` SKILL VOOR DEZE TAAK**
> Roep de `frontend-design` skill aan voor de implementatie van het dashboard UI. De skill genereert een kwalitatief hoogwaardig, productie-klaar ontwerp op basis van de onderstaande specificaties.

**Specificaties voor de frontend-design skill:**

*Dashboard pagina (`/dashboard`):*
- Server component, fetcht `getOrdersPerLocatie()` en `getVrachtenPerLocatie()`
- Drie kolommen naast elkaar (grid-cols-3), responsive
- Boven de kolommen: paginatitel "Dashboard" + subtitel met datum van vandaag

*`LocatieKolom` component:*
- Props: `locatie: Locatie`, `inBehandeling: Order[]`, `bevestigd: Order[]`, `vrachten: Vracht[]`
- Koptekst: locatielabel + badge met aantal `in_behandeling` orders
- Eerstvolgende deadline (uit alle orders) als subtekst — alleen als aanwezig
- Sectie "In behandeling" (of lege staat "Geen actieve orders")
- Sectie "Aankomend" (of niets tonen als leeg)
- Sectie "Uitgaande vrachten" (of niets tonen als leeg)

*`OrderKaartje` component:*
- Props: `order: Order`
- Toont: ordernummer + klant, status badge, deadline met kleurmarkering (`deadlineKleur`), THT als aanwezig, `order_grootte`
- Klikbaar: link naar `/orders/[id]`

*Vracht-item in LocatieKolom:*
- Datum + vrachtbrief nummer + klantnaam (compacte rij)
- Link naar `/vrachten/[id]`

- [ ] **Stap 1: Roep de `frontend-design` skill aan en geef bovenstaande specificaties door**

Als de frontend-design skill niet beschikbaar is, maak dan de volgende minimale structuur aan:

`src/app/(app)/dashboard/page.tsx` — Server component:
```tsx
import { getOrdersPerLocatie, getVrachtenPerLocatie } from '@/lib/db/dashboard'
import { LOCATIES } from '@/lib/constants/locaties'
import { LocatieKolom } from '@/components/dashboard/LocatieKolom'

export default async function DashboardPage() {
  const [orders, vrachten] = await Promise.all([
    getOrdersPerLocatie(),
    getVrachtenPerLocatie(),
  ])
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-3 gap-6">
        {LOCATIES.map(l => (
          <LocatieKolom
            key={l.waarde}
            locatie={l.waarde}
            label={l.label}
            inBehandeling={orders[l.waarde].inBehandeling}
            bevestigd={orders[l.waarde].bevestigd}
            vrachten={vrachten[l.waarde]}
          />
        ))}
      </div>
    </div>
  )
}
```

`src/components/dashboard/LocatieKolom.tsx` — Props:
```typescript
interface Props {
  locatie: string
  label: string
  inBehandeling: Order[]
  bevestigd: Order[]
  vrachten: Vracht[]
}
```

`src/components/dashboard/OrderKaartje.tsx` — Props: `{ order: Order }`, toont ordernummer, klant, status, deadline met `deadlineKleur`, tht, order_grootte.

- [ ] **Stap 2: Draai de app en controleer het dashboard**

```bash
npm run dev
```

Navigeer naar `/dashboard`. Controleer: drie kolommen zichtbaar, orders correct ingedeeld, deadlines correct gemarkeerd.

- [ ] **Stap 3: Commit (na goedkeuring van het ontwerp)**

```bash
git add src/app/\(app\)/dashboard/page.tsx src/components/dashboard/
git commit -m "feat: dashboard pagina met locatiekolommen (frontend-design)"
```

---

### Task 10: Navigatie

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Stap 1: Voeg Dashboard toe aan de navigatie**

In `src/app/(app)/layout.tsx`, voeg `{ href: '/dashboard', label: 'Dashboard' }` toe als eerste item van de `nav` array (voor Orders).

- [ ] **Stap 2: Commit**

```bash
git add src/app/\(app\)/layout.tsx
git commit -m "feat: dashboard link in navigatie"
```

---

## Verificatie na beide tracks

- [ ] Maak een nieuwe order aan met locatie, deadline en THT → opgeslagen in DB
- [ ] Bewerk een bestaande order → locatie/deadline/tht worden correct geladen en opgeslagen
- [ ] Voeg een levering toe met afwijkende THT → zichtbaar in leveringenlijst
- [ ] Open het dashboard → drie kolommen, orders correct ingedeeld per status en locatie
- [ ] Controleer deadline-kleuren: verlopen = rood, vandaag/morgen = oranje, verder = normaal
- [ ] Controleer dat een vracht met leveringen aan meerdere locaties in meerdere kolommen verschijnt
- [ ] Alle tests groen: `npm run test:run`
