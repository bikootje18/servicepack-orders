# Vrachtbrieven (CMR) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add vrachten (shipments) to the order system: group deliveries from one or more orders into a vracht, generate a CMR-layout vrachtbrief PDF, and create a single factuur covering all the deliveries in the vracht.

**Architecture:** A `vrachten` table groups existing `leveringen` via a `vracht_regels` junction table. A vracht belongs to one klant and may span multiple orders. The existing `facturen` table is extended to support vracht-based facturen (nullable `order_id`, nullable `tarief`, new `vracht_id` FK). Existing per-order factuur flow is unchanged. The vrachtbrief is a CMR-layout PDF generated client-side using the same imperative `pdf().toBlob()` pattern already in use for VoorraadExportKnop and FactuurPrintKnop.

**Tech Stack:** Next.js 14 App Router, Supabase (PostgreSQL + RLS), TypeScript, @react-pdf/renderer 4.x, Tailwind CSS, Vitest

---

## File Map

**New files:**
- `supabase/migrations/005_vrachten.sql` — schema: vrachten, vracht_regels, modify facturen
- `src/lib/db/vrachten.ts` — DB queries for vrachten
- `src/lib/db/vrachten.test.ts` — unit tests (pure functions only)
- `src/lib/actions/vrachten.ts` — Server Actions: createVracht, createVrachtFactuur
- `src/app/(app)/vrachten/page.tsx` — list all vrachten
- `src/app/(app)/vrachten/nieuw/page.tsx` — two-step: select klant → select leveringen
- `src/app/(app)/vrachten/[id]/page.tsx` — vracht detail: regels, PDF download, factuur aanmaken
- `src/components/vrachten/VrachtbriefDocument.tsx` — CMR PDF layout (@react-pdf/renderer)
- `src/components/vrachten/VrachtbriefKnop.tsx` — client button: imperative PDF generation
- `src/components/vrachten/VrachtFactuurDocument.tsx` — factuur PDF for multi-order vrachten
- `src/components/vrachten/VrachtFactuurKnop.tsx` — client button for vracht factuur PDF

**Modified files:**
- `src/types/index.ts` — add Vracht, VrachtRegel types; update Factuur (nullable order_id, nullable tarief, add vracht_id)
- `src/lib/db/facturen.ts` — add `getLeveringenVoorVrachtFactuur`, update `getFactuur` to join vracht
- `src/app/(app)/layout.tsx` — add Vrachten nav link
- `src/app/(app)/facturen/[id]/page.tsx` — handle vracht facturen (null order_id)

---

## Task 1: Database schema migration

**Files:**
- Create: `supabase/migrations/005_vrachten.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Sequence and function for vrachtbrief numbers (VB-YYYY-NNNN format)
CREATE SEQUENCE vrachtbrief_nummer_seq START 1;

CREATE OR REPLACE FUNCTION generate_vrachtbrief_nummer()
RETURNS text AS $$
DECLARE
  jaar text := to_char(CURRENT_DATE, 'YYYY');
  volgnummer text;
BEGIN
  volgnummer := lpad(nextval('vrachtbrief_nummer_seq')::text, 4, '0');
  RETURN 'VB-' || jaar || '-' || volgnummer;
END;
$$ LANGUAGE plpgsql;

-- Vrachten (one vracht = one physical shipment event)
CREATE TABLE vrachten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  klant_id uuid NOT NULL REFERENCES klanten(id),
  vrachtbrief_nummer text NOT NULL UNIQUE DEFAULT generate_vrachtbrief_nummer(),
  datum date NOT NULL DEFAULT CURRENT_DATE,
  notities text NOT NULL DEFAULT '',
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- vracht_regels: links individual leveringen to a vracht
-- A levering can only belong to one vracht (UNIQUE on levering_id)
CREATE TABLE vracht_regels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vracht_id uuid NOT NULL REFERENCES vrachten(id) ON DELETE CASCADE,
  levering_id uuid NOT NULL REFERENCES leveringen(id),
  UNIQUE(levering_id)
);

-- Extend facturen to support vracht-based invoices
-- order_id becomes nullable (null for vracht facturen that span multiple orders)
-- tarief becomes nullable (null for vracht facturen with mixed tarifeven)
-- vracht_id links to the vracht this factuur was created from
ALTER TABLE facturen ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE facturen ALTER COLUMN tarief DROP NOT NULL;
ALTER TABLE facturen ADD COLUMN vracht_id uuid REFERENCES vrachten(id);

-- RLS for new tables
ALTER TABLE vrachten ENABLE ROW LEVEL SECURITY;
ALTER TABLE vracht_regels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can do everything on vrachten"
  ON vrachten FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on vracht_regels"
  ON vracht_regels FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Run the migration in Supabase**

Go to Supabase Dashboard → SQL Editor → paste the contents of `005_vrachten.sql` → Run.

Verify in Table Editor: `vrachten` and `vracht_regels` tables exist. Check `facturen` columns: `order_id` is nullable, `tarief` is nullable, `vracht_id` column exists.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/005_vrachten.sql
git commit -m "feat: add vrachten schema migration"
```

---

## Task 2: TypeScript types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write the failing test (pure validation)**

Add to a new file `src/lib/db/vrachten.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { berekenVrachtBedrag } from './vrachten'

describe('berekenVrachtBedrag', () => {
  it('computes total from multiple order tarifeven', () => {
    const regels = [
      { aantal_geleverd: 1000, tarief: 0.05 },
      { aantal_geleverd: 500, tarief: 0.08 },
    ]
    expect(berekenVrachtBedrag(regels)).toBe(90.00)
  })

  it('rounds to 2 decimal places', () => {
    const regels = [{ aantal_geleverd: 3, tarief: 0.333 }]
    expect(berekenVrachtBedrag(regels)).toBe(1.00)
  })

  it('returns 0 for empty regels', () => {
    expect(berekenVrachtBedrag([])).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/db/vrachten.test.ts
```

Expected: FAIL — `berekenVrachtBedrag` not found.

- [ ] **Step 3: Update types in `src/types/index.ts`**

Add after the existing `Factuur` interface. Also update `Factuur` to make `order_id` nullable and add `vracht_id`.

**Important:** Do NOT change `tarief` to `number | null` yet — that change is bundled into Task 8 together with the page update that handles null tarief. Changing it now would cause a TypeScript error in the existing `facturen/[id]/page.tsx` (which multiplies `factuur.tarief * aantal_geleverd`) before Task 8 fixes it.

```typescript
// In the Factuur interface, change:
export interface Factuur {
  id: string
  factuur_nummer: string
  order_id: string | null      // null for vracht facturen
  vracht_id: string | null     // set for vracht facturen
  totaal_eenheden: number
  tarief: number               // stays number for now; Task 8 changes this to number | null
  totaal_bedrag: number
  status: FactuurStatus
  factuurdatum: string
  aangemaakt_door: string | null
  aangemaakt_op: string
  // Joins
  order?: Order
  vracht?: Vracht
}

// Add new types at the end of the file:
export interface Vracht {
  id: string
  klant_id: string
  vrachtbrief_nummer: string
  datum: string
  notities: string
  aangemaakt_op: string
  // Joins
  klant?: Klant
  regels?: VrachtRegel[]
  factuur?: Pick<Factuur, 'id' | 'factuur_nummer' | 'status' | 'totaal_bedrag'>
}

export interface VrachtRegel {
  id: string
  vracht_id: string
  levering_id: string
  // Joins
  levering?: Levering & {
    order?: Order & {
      facturatie_code?: FacturatieCode
    }
  }
}
```

- [ ] **Step 4: Create `src/lib/db/vrachten.ts` with `berekenVrachtBedrag`**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { Vracht, Levering, Order } from '@/types'

export function berekenVrachtBedrag(
  regels: { aantal_geleverd: number; tarief: number }[]
): number {
  const totaal = regels.reduce((sum, r) => sum + r.tarief * r.aantal_geleverd, 0)
  return Math.round(totaal * 100) / 100
}

export async function getVrachten(): Promise<Vracht[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vrachten')
    .select('*, klant:klanten(naam), factuur:facturen(id, factuur_nummer, status, totaal_bedrag)')
    .order('datum', { ascending: false })
  if (error) throw error
  return data as Vracht[]
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
      factuur:facturen(id, factuur_nummer, status, totaal_bedrag)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Vracht
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

  // Get levering_ids already in a vracht (to exclude from selection)
  const { data: inVracht, error: vrachtError } = await supabase
    .from('vracht_regels')
    .select('levering_id')
  if (vrachtError) throw vrachtError
  const inVrachtIds = new Set(inVracht.map(r => r.levering_id))

  // Get all unfactured leveringen for these orders
  const { data: leveringen, error } = await supabase
    .from('leveringen')
    .select('*, order:orders(*, facturatie_code:facturatie_codes(tarief, code))')
    .in('order_id', orderIds)
    .is('factuur_id', null)
    .order('leverdatum')
  if (error) throw error

  // Exclude those already assigned to a vracht
  return leveringen.filter(l => !inVrachtIds.has(l.id)) as any
}

export async function createVracht(data: {
  klant_id: string
  datum: string
  notities: string
  levering_ids: string[]
}): Promise<Vracht> {
  const supabase = await createClient()

  const { data: vracht, error: vrachtError } = await supabase
    .from('vrachten')
    .insert({
      klant_id: data.klant_id,
      datum: data.datum,
      notities: data.notities,
    })
    .select()
    .single()
  if (vrachtError) throw vrachtError

  const regels = data.levering_ids.map(levering_id => ({
    vracht_id: vracht.id,
    levering_id,
  }))

  const { error: regelsError } = await supabase
    .from('vracht_regels')
    .insert(regels)
  if (regelsError) throw regelsError

  return vracht as Vracht
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/lib/db/vrachten.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/db/vrachten.ts src/lib/db/vrachten.test.ts
git commit -m "feat: add Vracht types and DB query functions"
```

---

## Task 3: DB support for vracht facturen + Server Actions

**Files:**
- Modify: `src/lib/db/facturen.ts`
- Create: `src/lib/actions/vrachten.ts`

- [ ] **Step 1: Update `src/lib/db/facturen.ts`**

Add `getLeveringenVoorVrachtFactuur` function and `createVrachtFactuur` function, and update `getFactuur` to also join the vracht:

```typescript
// Add these two new exports to src/lib/db/facturen.ts:

export async function getLeveringenVoorVrachtFactuur(
  factuurId: string
): Promise<(Levering & { order: Order & { facturatie_code: { tarief: number } } })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leveringen')
    .select('*, order:orders(order_nummer, omschrijving, facturatie_code:facturatie_codes(tarief))')
    .eq('factuur_id', factuurId)
    .order('leverdatum')
  if (error) throw error
  return data as any
}

export async function createVrachtFactuur(vrachtId: string): Promise<Factuur> {
  const supabase = await createClient()

  // Load all vracht regels with leveringen + order tarifeven
  const { data: regels, error: regelsError } = await supabase
    .from('vracht_regels')
    .select('levering_id, levering:leveringen(id, aantal_geleverd, order:orders(facturatie_code:facturatie_codes(tarief)))')
    .eq('vracht_id', vrachtId)
  if (regelsError) throw regelsError

  const totaalEenheden = regels.reduce((sum: number, r: any) => sum + r.levering.aantal_geleverd, 0)
  const totaalBedrag = regels.reduce((sum: number, r: any) => {
    const tarief = r.levering.order.facturatie_code.tarief
    return sum + tarief * r.levering.aantal_geleverd
  }, 0)

  const { data: factuurNummer, error: seqError } = await supabase.rpc('generate_factuur_nummer')
  if (seqError) throw seqError

  const { data: factuur, error: factuurError } = await supabase
    .from('facturen')
    .insert({
      factuur_nummer: factuurNummer,
      vracht_id: vrachtId,
      order_id: null,
      totaal_eenheden: totaalEenheden,
      tarief: null,
      totaal_bedrag: Math.round(totaalBedrag * 100) / 100,
      factuurdatum: new Date().toISOString().split('T')[0],
      aangemaakt_door: null,
    })
    .select()
    .single()
  if (factuurError) throw factuurError

  // Link all leveringen to this factuur
  const leveringIds = regels.map((r: any) => r.levering_id)
  const { error: linkError } = await supabase
    .from('leveringen')
    .update({ factuur_id: factuur.id })
    .in('id', leveringIds)
  if (linkError) throw linkError

  return factuur as Factuur
}
```

Also update the existing `getFactuur` function to join the vracht (replace the `.select(...)` line):

```typescript
// Replace the select string in getFactuur with:
.select('*, order:orders(*, klant:klanten(naam), facturatie_code:facturatie_codes(code)), vracht:vrachten(*, klant:klanten(naam))')
```

- [ ] **Step 2: Create `src/lib/actions/vrachten.ts`**

```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createVracht } from '@/lib/db/vrachten'
import { createVrachtFactuur as dbCreateFactuur } from '@/lib/db/facturen'

export async function createVrachtAction(formData: FormData): Promise<void> {
  const klant_id = formData.get('klant_id') as string
  const datum = formData.get('datum') as string
  const notities = formData.get('notities') as string ?? ''
  const levering_ids = formData.getAll('levering_ids') as string[]

  if (!klant_id || !datum || levering_ids.length === 0) return

  const vracht = await createVracht({ klant_id, datum, notities, levering_ids })
  redirect(`/vrachten/${vracht.id}`)
}

export async function createVrachtFactuurAction(vrachtId: string): Promise<void> {
  const factuur = await dbCreateFactuur(vrachtId)
  revalidatePath(`/vrachten/${vrachtId}`)
  redirect(`/facturen/${factuur.id}`)
}
```

- [ ] **Step 3: Add null-safety guard to `src/app/(app)/facturen/[id]/page.tsx`**

The schema migration in Task 1 made `order_id` nullable. A vracht factuur (with null `order_id`) would crash the existing page at `getLeveringen(factuur.order_id)`. Add a guard now so the page safely shows an empty state for vracht facturen until Task 8 fully replaces it.

Find this block (around line 18–22) in the existing `facturen/[id]/page.tsx`:

```typescript
  const { id } = await params
  const factuur = await getFactuur(id)
  const leveringen = await getLeveringen(factuur.order_id).then(all =>
    all.filter(l => l.factuur_id === id)
  )
  const klantNaam = (factuur.order as any)?.klant?.naam ?? '–'
```

Replace with:

```typescript
  const { id } = await params
  const factuur = await getFactuur(id)
  // Guard: vracht facturen have null order_id — Task 8 fully handles them
  const leveringen = factuur.order_id
    ? await getLeveringen(factuur.order_id).then(all => all.filter(l => l.factuur_id === id))
    : []
  const klantNaam = (factuur.order as any)?.klant?.naam
    ?? (factuur.vracht as any)?.klant?.naam
    ?? '–'
```

- [ ] **Step 4: Run existing tests to verify nothing broke**

```bash
npx vitest run
```

Expected: all 21+ tests still passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/facturen.ts src/lib/actions/vrachten.ts src/app/(app)/facturen/[id]/page.tsx
git commit -m "feat: add vracht factuur DB functions and server actions, guard factuur page for null order_id"
```

---

## Task 4: Navigation + Vrachten list page

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/vrachten/page.tsx`

- [ ] **Step 1: Add Vrachten to nav in `src/app/(app)/layout.tsx`**

Find the `nav` array and add an entry between Facturen and Voorraad:

```typescript
const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/vrachten', label: 'Vrachten' },
  { href: '/facturen', label: 'Facturen' },
  { href: '/voorraad', label: 'Voorraad' },
  { href: '/klanten', label: 'Klanten' },
  { href: '/codes', label: 'Codes' },
]
```

- [ ] **Step 2: Create `src/app/(app)/vrachten/page.tsx`**

```typescript
import Link from 'next/link'
import { getVrachten } from '@/lib/db/vrachten'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'

export default async function VrachtenPage() {
  const vrachten = await getVrachten()

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vrachten</h1>
        <Link href="/vrachten/nieuw"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
          + Nieuwe vracht
        </Link>
      </div>

      {vrachten.length === 0 ? (
        <p className="text-gray-500 text-sm">Nog geen vrachten aangemaakt.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">Vrachtbrief nr.</th>
              <th className="text-left py-2 font-medium text-gray-600">Klant</th>
              <th className="text-left py-2 font-medium text-gray-600">Datum</th>
              <th className="text-left py-2 font-medium text-gray-600">Factuur</th>
              <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {vrachten.map(v => (
              <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2">
                  <Link href={`/vrachten/${v.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                    {v.vrachtbrief_nummer}
                  </Link>
                </td>
                <td className="py-2">{v.klant?.naam}</td>
                <td className="py-2">{formatDate(v.datum)}</td>
                <td className="py-2">
                  {v.factuur ? (
                    <Link href={`/facturen/${v.factuur.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                      {v.factuur.factuur_nummer}
                    </Link>
                  ) : (
                    <span className="text-gray-400">–</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {v.factuur ? formatCurrency(v.factuur.totaal_bedrag) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify page renders**

Start dev server (`npm run dev`) and navigate to `/vrachten`. Expect: empty state message "Nog geen vrachten aangemaakt." and a "+ Nieuwe vracht" button.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/layout.tsx src/app/(app)/vrachten/page.tsx
git commit -m "feat: add vrachten list page and nav link"
```

---

## Task 5: Nieuwe vracht page

**Files:**
- Create: `src/app/(app)/vrachten/nieuw/page.tsx`

This page works in two steps based on the `klant_id` query param:
- Without `klant_id`: show klant selector
- With `klant_id`: show ongefactureerde, non-vrachted leveringen for that klant

- [ ] **Step 1: Create `src/app/(app)/vrachten/nieuw/page.tsx`**

```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getKlanten } from '@/lib/db/klanten'
import { getOngefactureerdeLeveringenVoorKlant } from '@/lib/db/vrachten'
import { createVrachtAction } from '@/lib/actions/vrachten'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

export default async function NieuweVrachtPage({
  searchParams,
}: {
  searchParams: Promise<{ klant_id?: string }>
}) {
  const { klant_id } = await searchParams

  // Step 1: no klant_id → show klant picker
  if (!klant_id) {
    const klanten = await getKlanten()
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-6">Nieuwe vracht – kies klant</h1>
        <div className="space-y-2">
          {klanten.map(k => (
            <Link
              key={k.id}
              href={`/vrachten/nieuw?klant_id=${k.id}`}
              className="block border border-gray-200 rounded px-4 py-3 hover:bg-gray-50 text-sm font-medium"
            >
              {k.naam}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: klant_id known → show available leveringen
  const leveringen = await getOngefactureerdeLeveringenVoorKlant(klant_id)
  const klantNaam = leveringen[0]?.order?.klant?.naam ?? klant_id

  if (leveringen.length === 0) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold mb-2">Nieuwe vracht</h1>
        <p className="text-gray-500 text-sm mb-4">
          Geen beschikbare leveringen voor deze klant. Voeg eerst leveringen toe aan orders.
        </p>
        <Link href="/vrachten/nieuw" className="text-sm text-blue-600 hover:underline">
          ← Andere klant kiezen
        </Link>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Nieuwe vracht</h1>
        <p className="text-gray-500 text-sm">
          {klantNaam} ·{' '}
          <Link href="/vrachten/nieuw" className="text-blue-600 hover:underline">andere klant</Link>
        </p>
      </div>

      <form action={createVrachtAction}>
        <input type="hidden" name="klant_id" value={klant_id} />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
            <input
              type="date"
              name="datum"
              defaultValue={today}
              required
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
            <input
              type="text"
              name="notities"
              placeholder="Optioneel"
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        <h2 className="font-semibold mb-3">Selecteer leveringen</h2>
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-8"></th>
              <th className="text-left py-2 font-medium text-gray-600">Order</th>
              <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
              <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
            </tr>
          </thead>
          <tbody>
            {leveringen.map(l => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2">
                  <input type="checkbox" name="levering_ids" value={l.id} defaultChecked />
                </td>
                <td className="py-2 font-mono text-xs">{(l as any).order?.order_nummer}</td>
                <td className="py-2">{formatDate(l.leverdatum)}</td>
                <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          Vracht aanmaken
        </button>
      </form>
    </div>
  )
}
```

Note: `getOngefactureerdeLeveringenVoorKlant` returns leveringen with `order.klant` on the join. Update the select in `vrachten.ts` to include `klant:klanten(naam)` in the orders join if you want to show klantNaam from the levering:

```typescript
// In getOngefactureerdeLeveringenVoorKlant, update the select:
.select('*, order:orders(*, klant:klanten(naam), facturatie_code:facturatie_codes(tarief, code))')
```

- [ ] **Step 2: Verify flow in browser**

Navigate to `/vrachten/nieuw` → klant selector appears. Click a klant → leveringen table appears. Select some leveringen → submit → redirected to `/vrachten/[id]` (will 404 until Task 6, but vracht should be created in DB).

Verify in Supabase: `vrachten` table has a new row, `vracht_regels` has the selected leveringen.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/vrachten/nieuw/page.tsx
git commit -m "feat: add nieuwe vracht creation page"
```

---

## Task 6: Vracht detail page

**Files:**
- Create: `src/app/(app)/vrachten/[id]/page.tsx`

- [ ] **Step 1: Create `src/app/(app)/vrachten/[id]/page.tsx`**

```typescript
import Link from 'next/link'
import { getVracht } from '@/lib/db/vrachten'
import { createVrachtFactuurAction } from '@/lib/actions/vrachten'
import { VrachtbriefKnop } from '@/components/vrachten/VrachtbriefKnop'
import { formatDate, formatAantal, formatCurrency } from '@/lib/utils/formatters'

export default async function VrachtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const vracht = await getVracht(id)
  const regels = vracht.regels ?? []

  const totaalEenheden = regels.reduce(
    (sum, r) => sum + (r.levering?.aantal_geleverd ?? 0), 0
  )

  async function factuurAanmaken() {
    'use server'
    await createVrachtFactuurAction(id)
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono mb-1">{vracht.vrachtbrief_nummer}</h1>
          <p className="text-gray-500 text-sm">
            {vracht.klant?.naam} · {formatDate(vracht.datum)}
          </p>
        </div>
        <div className="flex gap-2">
          <VrachtbriefKnop vracht={vracht} />
        </div>
      </div>

      {vracht.notities && (
        <p className="text-sm text-gray-600 mb-4 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
          {vracht.notities}
        </p>
      )}

      <h2 className="font-semibold mb-3">Leveringen in deze vracht</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-left py-2 font-medium text-gray-600">Leverdatum</th>
            <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
            <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {regels.map(r => {
            const levering = r.levering!
            const tarief = levering.order?.facturatie_code?.tarief ?? 0
            return (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-2">
                  <Link
                    href={`/orders/${levering.order_id}`}
                    className="font-mono text-xs text-blue-600 hover:underline"
                  >
                    {levering.order?.order_nummer}
                  </Link>
                </td>
                <td className="py-2">{formatDate(levering.leverdatum)}</td>
                <td className="py-2 text-right">{formatAantal(levering.aantal_geleverd)}</td>
                <td className="py-2 text-right">{formatCurrency(tarief * levering.aantal_geleverd)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-300">
            <td className="py-2 font-semibold" colSpan={2}>Totaal</td>
            <td className="py-2 text-right font-semibold">{formatAantal(totaalEenheden)}</td>
            <td className="py-2 text-right font-semibold">
              {formatCurrency(
                regels.reduce((sum, r) => {
                  const tarief = r.levering?.order?.facturatie_code?.tarief ?? 0
                  return sum + tarief * (r.levering?.aantal_geleverd ?? 0)
                }, 0)
              )}
            </td>
          </tr>
        </tfoot>
      </table>

      {vracht.factuur ? (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
          <p className="font-medium text-green-800 mb-1">Factuur aangemaakt</p>
          <Link
            href={`/facturen/${vracht.factuur.id}`}
            className="text-blue-600 hover:underline font-mono text-xs"
          >
            {vracht.factuur.factuur_nummer}
          </Link>
          {' · '}
          {formatCurrency(vracht.factuur.totaal_bedrag ?? 0)}
        </div>
      ) : (
        <form action={factuurAanmaken}>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700"
          >
            Factuur aanmaken
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify page renders** (VrachtbriefKnop doesn't exist yet — will cause a build error; create a stub first)

Create a temporary stub at `src/components/vrachten/VrachtbriefKnop.tsx`:

```typescript
'use client'
export function VrachtbriefKnop({ vracht }: { vracht: any }) {
  return <button className="text-sm border border-gray-300 px-3 py-1 rounded" disabled>PDF (laden...)</button>
}
```

Now navigate to `/vrachten/[id]` for an existing vracht. Expect: table of leveringen, "Factuur aanmaken" button.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/vrachten/[id]/page.tsx src/components/vrachten/VrachtbriefKnop.tsx
git commit -m "feat: add vracht detail page"
```

---

## Task 7: CMR Vrachtbrief PDF

**Files:**
- Modify: `src/components/vrachten/VrachtbriefDocument.tsx` (replace the stub with real implementation)
- Modify: `src/components/vrachten/VrachtbriefKnop.tsx` (replace stub with real implementation)

The CMR document uses a grid of bordered boxes mimicking the standard CMR form layout, rendered via @react-pdf/renderer. We keep it functional rather than pixel-perfect.

- [ ] **Step 1: Create `src/components/vrachten/VrachtbriefDocument.tsx`**

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Vracht } from '@/types'

const S = StyleSheet.create({
  page: { padding: 20, fontFamily: 'Helvetica', fontSize: 9, color: '#111' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 8, textAlign: 'center', color: '#555', marginBottom: 10 },
  row: { flexDirection: 'row' },
  box: { border: '1pt solid #333', padding: 5, flex: 1 },
  boxLabel: { fontSize: 7, color: '#555', marginBottom: 2 },
  boxValue: { fontSize: 9 },
  // Goods table
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderTop: '1pt solid #333', borderLeft: '1pt solid #333' },
  tableRow: { flexDirection: 'row', borderTop: '1pt solid #ccc', borderLeft: '1pt solid #333' },
  cell: { borderRight: '1pt solid #333', padding: '3 4', fontSize: 8 },
  cellRight: { borderRight: '1pt solid #333', padding: '3 4', fontSize: 8, textAlign: 'right' },
  // Signature row
  signatureBox: { border: '1pt solid #333', flex: 1, height: 50, padding: 4 },
  signatureLabel: { fontSize: 7, color: '#555' },
  footer: { marginTop: 4, fontSize: 7, color: '#888', textAlign: 'center' },
})

interface Props {
  vracht: Vracht & {
    klant: { naam: string }
    regels: Array<{
      levering: {
        id: string
        leverdatum: string
        aantal_geleverd: number
        order_id: string
        order: {
          order_nummer: string
          omschrijving: string
          aantal_per_doos: number
          aantal_per_inner: number
          aantal_per_pallet: number
          facturatie_code?: { code: string }
        }
      }
    }>
  }
}

function verpakkingLabel(aantal: number, perDoos: number, perPallet: number): string {
  const parts: string[] = []
  if (perPallet > 0) parts.push(`${Math.ceil(aantal / perPallet)} pal`)
  if (perDoos > 0) parts.push(`${Math.ceil(aantal / perDoos)} ds`)
  return parts.join(' / ') || '–'
}

export function VrachtbriefDocument({ vracht }: Props) {
  const regels = vracht.regels ?? []
  const totaalEenheden = regels.reduce((sum, r) => sum + r.levering.aantal_geleverd, 0)

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>VRACHTBRIEF / CMR</Text>
        <Text style={S.subtitle}>
          {vracht.vrachtbrief_nummer} · {vracht.datum}
        </Text>

        {/* Top section: sender | consignee | reference */}
        <View style={S.row}>
          <View style={{ ...S.box, flex: 2 }}>
            <Text style={S.boxLabel}>1. Afzender (naam, adres, land)</Text>
            <Text style={S.boxValue}>[Uw bedrijfsnaam]</Text>
            <Text style={{ fontSize: 8, color: '#aaa' }}>[Adres invullen]</Text>
          </View>
          <View style={{ ...S.box, flex: 2 }}>
            <Text style={S.boxLabel}>2. Ontvanger (naam, adres, land)</Text>
            <Text style={S.boxValue}>{vracht.klant.naam}</Text>
            <Text style={{ fontSize: 8, color: '#aaa' }}>[Adres invullen]</Text>
          </View>
          <View style={{ ...S.box, flex: 1 }}>
            <Text style={S.boxLabel}>Vrachtbrief nr.</Text>
            <Text style={{ ...S.boxValue, fontFamily: 'Helvetica-Bold' }}>{vracht.vrachtbrief_nummer}</Text>
            <Text style={{ ...S.boxLabel, marginTop: 4 }}>Datum</Text>
            <Text style={S.boxValue}>{vracht.datum}</Text>
          </View>
        </View>

        {/* Delivery place + carrier */}
        <View style={S.row}>
          <View style={{ ...S.box, flex: 2 }}>
            <Text style={S.boxLabel}>3. Afleverplaats (plaats, land)</Text>
            <Text style={{ fontSize: 8, color: '#aaa' }}>[Afleverplaats invullen]</Text>
          </View>
          <View style={{ ...S.box, flex: 1 }}>
            <Text style={S.boxLabel}>8. Vervoerder</Text>
            <Text style={{ fontSize: 8, color: '#aaa' }}>[Vervoerder invullen]</Text>
          </View>
          <View style={{ ...S.box, flex: 2 }}>
            <Text style={S.boxLabel}>16. Bijzondere overeenkomsten</Text>
            <Text style={S.boxValue}>{vracht.notities || '–'}</Text>
          </View>
        </View>

        {/* Goods table */}
        <View style={{ marginTop: 6 }}>
          <View style={S.tableHeader}>
            <Text style={{ ...S.cell, flex: 2, borderBottom: '1pt solid #333' }}>Ordernummer / Omschrijving</Text>
            <Text style={{ ...S.cellRight, flex: 1, borderBottom: '1pt solid #333' }}>Eenheden</Text>
            <Text style={{ ...S.cell, flex: 1, borderBottom: '1pt solid #333' }}>Verpakking</Text>
            <Text style={{ ...S.cellRight, flex: 1, borderBottom: '1pt solid #333', borderRight: '1pt solid #333' }}>Tarief code</Text>
          </View>
          {regels.map(r => {
            const l = r.levering
            const o = l.order
            return (
              <View key={l.id} style={{ ...S.tableRow, borderBottom: '1pt solid #ccc' }}>
                <View style={{ ...S.cell, flex: 2 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>{o.order_nummer}</Text>
                  {o.omschrijving ? <Text style={{ fontSize: 7, color: '#555' }}>{o.omschrijving}</Text> : null}
                </View>
                <Text style={{ ...S.cellRight, flex: 1 }}>{l.aantal_geleverd.toLocaleString('nl-NL')}</Text>
                <Text style={{ ...S.cell, flex: 1 }}>
                  {verpakkingLabel(l.aantal_geleverd, o.aantal_per_doos, o.aantal_per_pallet)}
                </Text>
                <Text style={{ ...S.cellRight, flex: 1, borderRight: '1pt solid #333' }}>
                  {o.facturatie_code?.code ?? '–'}
                </Text>
              </View>
            )
          })}
          <View style={{ flexDirection: 'row', borderTop: '1pt solid #333', borderLeft: '1pt solid #333' }}>
            <Text style={{ ...S.cell, flex: 2, fontFamily: 'Helvetica-Bold' }}>Totaal</Text>
            <Text style={{ ...S.cellRight, flex: 1, fontFamily: 'Helvetica-Bold', borderRight: '1pt solid #333' }}>
              {totaalEenheden.toLocaleString('nl-NL')}
            </Text>
            <Text style={{ ...S.cell, flex: 1, borderRight: '1pt solid #333' }}></Text>
            <Text style={{ ...S.cell, flex: 1, borderRight: '1pt solid #333' }}></Text>
          </View>
        </View>

        {/* Sender instructions */}
        <View style={{ ...S.box, marginTop: 6, height: 30 }}>
          <Text style={S.boxLabel}>13. Instructies afzender (douane, etc.)</Text>
        </View>

        {/* Signature row */}
        <View style={{ ...S.row, marginTop: 6 }}>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Handtekening afzender</Text>
          </View>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Handtekening vervoerder</Text>
          </View>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Handtekening ontvanger</Text>
          </View>
        </View>

        <Text style={S.footer}>
          Dit document is opgemaakt door het Order Systeem · {new Date().toLocaleDateString('nl-NL')}
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Replace the stub `src/components/vrachten/VrachtbriefKnop.tsx` with the real implementation**

```typescript
'use client'

import { useState } from 'react'
import type { Vracht } from '@/types'

interface Props {
  vracht: Vracht
}

export function VrachtbriefKnop({ vracht }: Props) {
  const [laden, setLaden] = useState(false)

  async function handleDownload() {
    setLaden(true)
    try {
      const [{ pdf }, { createElement }, { VrachtbriefDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./VrachtbriefDocument'),
      ])
      const blob = await pdf(createElement(VrachtbriefDocument, { vracht })).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vrachtbrief-${vracht.vrachtbrief_nummer}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLaden(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={laden}
      className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50"
    >
      {laden ? 'PDF laden...' : 'Download vrachtbrief'}
    </button>
  )
}
```

- [ ] **Step 3: Verify PDF generation**

Navigate to `/vrachten/[id]` for a vracht with leveringen. Click "Download vrachtbrief" — PDF should download with CMR layout showing the goods table.

- [ ] **Step 4: Commit**

```bash
git add src/components/vrachten/VrachtbriefDocument.tsx src/components/vrachten/VrachtbriefKnop.tsx
git commit -m "feat: add CMR vrachtbrief PDF document and download button"
```

---

## Task 8: Factuur detail page — support vracht facturen

**Files:**
- Modify: `src/app/(app)/facturen/[id]/page.tsx`
- Create: `src/components/vrachten/VrachtFactuurDocument.tsx`
- Create: `src/components/vrachten/VrachtFactuurKnop.tsx`

Currently the factuur detail page has only a null-safety guard (from Task 3). This task fully replaces it with proper vracht factuur handling and also completes the `tarief: number | null` type change that was deferred from Task 2.

- [ ] **Step 1: Create `src/components/vrachten/VrachtFactuurDocument.tsx`**

```typescript
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Factuur, Levering, Order, FacturatieCode } from '@/types'

const S = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111' },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  total: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  disclaimer: { marginTop: 32, fontSize: 8, color: '#888' },
  orderHeader: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#555', paddingVertical: 2, marginTop: 4 },
})

type LeveringMetOrder = Levering & {
  order?: Pick<Order, 'order_nummer' | 'omschrijving'> & {
    facturatie_code?: Pick<FacturatieCode, 'tarief'>
  }
}

interface Props {
  factuur: Factuur
  leveringen: LeveringMetOrder[]
  klantNaam: string
}

export function VrachtFactuurDocument({ factuur, leveringen, klantNaam }: Props) {
  // Group by order
  const groups = leveringen.reduce<Record<string, LeveringMetOrder[]>>((acc, l) => {
    const key = (l as any).order?.order_nummer ?? 'Onbekend'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>Factuur {factuur.factuur_nummer}</Text>
          <Text style={S.subtitle}>{klantNaam}</Text>
          <Text style={S.subtitle}>Datum: {factuur.factuurdatum}</Text>
        </View>

        {Object.entries(groups).map(([orderNummer, regels]) => {
          const tarief = (regels[0] as any).order?.facturatie_code?.tarief ?? 0
          return (
            <View key={orderNummer}>
              <Text style={S.orderHeader}>Order: {orderNummer}</Text>
              <View style={S.row}>
                <Text style={{ fontFamily: 'Helvetica-Bold', flex: 2 }}>Leverdatum</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' }}>Eenheden</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' }}>Bedrag</Text>
              </View>
              {regels.map(l => (
                <View key={l.id} style={S.row}>
                  <Text style={{ flex: 2 }}>{l.leverdatum}</Text>
                  <Text style={{ flex: 1, textAlign: 'right' }}>{l.aantal_geleverd.toLocaleString('nl-NL')}</Text>
                  <Text style={{ flex: 1, textAlign: 'right' }}>€ {(tarief * l.aantal_geleverd).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )
        })}

        <View style={{ ...S.total, marginTop: 12 }}>
          <Text>Totaal excl. BTW</Text>
          <Text>€ {factuur.totaal_bedrag.toFixed(2)}</Text>
        </View>

        <Text style={S.disclaimer}>
          Bedragen excl. BTW. Dit document is geen officieel belastingdocument.
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Create `src/components/vrachten/VrachtFactuurKnop.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { Factuur, Levering } from '@/types'

interface Props {
  factuur: Factuur
  leveringen: Levering[]
  klantNaam: string
}

export function VrachtFactuurKnop({ factuur, leveringen, klantNaam }: Props) {
  const [laden, setLaden] = useState(false)

  async function handleDownload() {
    setLaden(true)
    try {
      const [{ pdf }, { createElement }, { VrachtFactuurDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./VrachtFactuurDocument'),
      ])
      const blob = await pdf(createElement(VrachtFactuurDocument, { factuur, leveringen, klantNaam })).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factuur-${factuur.factuur_nummer}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLaden(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={laden}
      className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
    >
      {laden ? 'PDF laden...' : 'Download PDF'}
    </button>
  )
}
```

- [ ] **Step 3: Update `tarief` type to `number | null` in `src/types/index.ts`**

Now that the page replacement in Step 4 below handles null tarief safely, update the type:

```typescript
// In the Factuur interface, change:
tarief: number | null        // null for vracht facturen with mixed tarifeven
```

- [ ] **Step 4: Update `src/app/(app)/facturen/[id]/page.tsx` to handle vracht facturen**

Replace the entire file with this version that branches based on whether `factuur.vracht_id` is set:

```typescript
import Link from 'next/link'
import { getFactuur, updateFactuurStatus, getLeveringenVoorVrachtFactuur } from '@/lib/db/facturen'
import { getLeveringen } from '@/lib/db/leveringen'
import { FactuurPrintKnop } from '@/components/facturen/FactuurPrintKnop'
import { VrachtFactuurKnop } from '@/components/vrachten/VrachtFactuurKnop'
import { revalidatePath } from 'next/cache'
import { formatDate, formatCurrency, formatAantal } from '@/lib/utils/formatters'

const statusLabel: Record<string, string> = {
  concept: 'Concept',
  verzonden: 'Verzonden',
  betaald: 'Betaald',
}

export default async function FactuurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const factuur = await getFactuur(id)
  const isVrachtFactuur = !!factuur.vracht_id

  const leveringen = isVrachtFactuur
    ? await getLeveringenVoorVrachtFactuur(id)
    : await getLeveringen(factuur.order_id!).then(all => all.filter(l => l.factuur_id === id))

  const klantNaam = isVrachtFactuur
    ? (factuur.vracht as any)?.klant?.naam ?? '–'
    : (factuur.order as any)?.klant?.naam ?? '–'

  async function setVerzonden() {
    'use server'
    await updateFactuurStatus(id, 'verzonden')
    revalidatePath(`/facturen/${id}`)
  }

  async function setBetaald() {
    'use server'
    await updateFactuurStatus(id, 'betaald')
    revalidatePath(`/facturen/${id}`)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono mb-1">{factuur.factuur_nummer}</h1>
          <p className="text-gray-500 text-sm">
            {klantNaam} · {statusLabel[factuur.status]}
            {isVrachtFactuur && factuur.vracht_id && (
              <>
                {' · '}
                <Link href={`/vrachten/${factuur.vracht_id}`} className="text-blue-600 hover:underline">
                  Vrachtbrief
                </Link>
              </>
            )}
          </p>
        </div>
        {isVrachtFactuur ? (
          <VrachtFactuurKnop factuur={factuur} leveringen={leveringen as any} klantNaam={klantNaam} />
        ) : (
          <FactuurPrintKnop factuur={factuur} leveringen={leveringen as any} klantNaam={klantNaam} />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Factuurdatum:</span> <strong>{formatDate(factuur.factuurdatum)}</strong></div>
        {isVrachtFactuur ? (
          <div><span className="text-gray-500">Vrachten:</span>{' '}
            <Link href={`/vrachten/${factuur.vracht_id}`} className="font-mono text-xs text-blue-600 hover:underline">
              {(factuur.vracht as any)?.vrachtbrief_nummer}
            </Link>
          </div>
        ) : (
          <div><span className="text-gray-500">Order:</span>{' '}
            <strong className="font-mono text-xs">{(factuur.order as any)?.order_nummer}</strong>
          </div>
        )}
        <div><span className="text-gray-500">Totaal eenheden:</span> <strong>{formatAantal(factuur.totaal_eenheden)}</strong></div>
        {factuur.tarief != null && (
          <div><span className="text-gray-500">Tarief:</span> <strong>{formatCurrency(factuur.tarief)} / eenheid</strong></div>
        )}
        <div className="col-span-2 pt-2 border-t border-gray-100">
          <span className="text-gray-500">Totaalbedrag excl. BTW:</span>{' '}
          <strong className="text-lg">{formatCurrency(factuur.totaal_bedrag)}</strong>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Leveringen in deze factuur</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            {isVrachtFactuur && <th className="text-left py-2 font-medium text-gray-600">Order</th>}
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
            <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
            <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {leveringen.map(l => {
            const tarief = isVrachtFactuur
              ? (l as any).order?.facturatie_code?.tarief ?? 0
              : factuur.tarief ?? 0
            return (
              <tr key={l.id} className="border-b border-gray-100">
                {isVrachtFactuur && (
                  <td className="py-2 font-mono text-xs">{(l as any).order?.order_nummer}</td>
                )}
                <td className="py-2">{formatDate(l.leverdatum)}</td>
                <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
                <td className="py-2 text-right">{formatCurrency(tarief * l.aantal_geleverd)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex gap-3">
        {factuur.status === 'concept' && (
          <form action={setVerzonden}>
            <button type="submit"
              className="border border-blue-300 text-blue-700 px-4 py-2 rounded text-sm font-medium hover:bg-blue-50">
              Markeer als verzonden
            </button>
          </form>
        )}
        {factuur.status === 'verzonden' && (
          <form action={setBetaald}>
            <button type="submit"
              className="border border-green-300 text-green-700 px-4 py-2 rounded text-sm font-medium hover:bg-green-50">
              Markeer als betaald
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Build check**

```bash
npm run build
```

Expected: clean build with no type errors.

- [ ] **Step 7: End-to-end verification in browser**

1. Go to `/vrachten/nieuw` → select a klant → select leveringen → submit
2. On the vracht detail page: click "Download vrachtbrief" — CMR PDF should download
3. Click "Factuur aanmaken" — redirected to `/facturen/[id]` for the new factuur
4. On the factuur page: shows per-order breakdown, "Download PDF" button works
5. Go back to `/vrachten/[id]` — factuur is now shown with link
6. Go to `/facturen` — vracht factuur appears in the list

- [ ] **Step 8: Commit**

```bash
git add src/types/index.ts src/components/vrachten/VrachtFactuurDocument.tsx src/components/vrachten/VrachtFactuurKnop.tsx src/app/(app)/facturen/[id]/page.tsx
git commit -m "feat: factuur detail page supports vracht facturen with per-order PDF"
```
