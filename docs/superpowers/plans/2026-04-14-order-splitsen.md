# Order splitsen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maak het mogelijk om een order te splitsen in twee onafhankelijke orders, waarbij het origineel zijn nummer behoudt en het afgesplitste deel een suffix-nummer krijgt (bijv. 123456A).

**Architecture:** Twee nieuwe kolommen op de `orders` tabel (`gesplitst_van`, `gesplitst_naar`) leggen de relatie vast. Een nieuwe `splitsOrder` DB-functie en server action regelen de logica. De UI voegt een inline splits-formulier toe op de orderdetailpagina.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Vitest

---

## Bestandsoverzicht

| Bestand | Wijziging |
|---|---|
| `supabase/migrations/027_order_splitsen.sql` | Nieuwe kolommen + migratie |
| `src/types/index.ts` | `gesplitst_van` en `gesplitst_naar` toevoegen aan `Order` |
| `src/lib/db/orders.ts` | `bepaalSplitNummer` en `splitsOrder` functies |
| `src/lib/db/orders.test.ts` | Tests voor `bepaalSplitNummer` |
| `src/lib/actions/orders.ts` | `splitsOrderAction` server action |
| `src/components/orders/SplitsOrderForm.tsx` | Nieuw: inline formulier component |
| `src/app/(app)/orders/[id]/page.tsx` | Splits-knop + verwijzingen tonen |

---

### Task 1: Database migratie

**Files:**
- Create: `supabase/migrations/027_order_splitsen.sql`

- [ ] **Stap 1: Maak de migratie aan**

```sql
-- supabase/migrations/027_order_splitsen.sql
ALTER TABLE orders ADD COLUMN gesplitst_van uuid REFERENCES orders(id);
ALTER TABLE orders ADD COLUMN gesplitst_naar uuid REFERENCES orders(id);
```

- [ ] **Stap 2: Voer de migratie uit in Supabase**

Plak de SQL in de Supabase SQL editor en voer uit.

Verwacht: geen errors, twee nieuwe nullable kolommen op de `orders` tabel.

- [ ] **Stap 3: Commit**

```bash
git add supabase/migrations/027_order_splitsen.sql
git commit -m "feat: voeg gesplitst_van en gesplitst_naar kolommen toe aan orders"
```

---

### Task 2: TypeScript type uitbreiden

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Stap 1: Voeg de twee velden toe aan de `Order` interface**

Zoek in `src/types/index.ts` het `Order` interface. Voeg onderaan (vóór de `// Joins` sectie) toe:

```typescript
  gesplitst_van: string | null
  gesplitst_naar: string | null
```

Resultaat — de relevante sectie ziet er zo uit:
```typescript
  pallet_type: PalletType
  gesplitst_van: string | null
  gesplitst_naar: string | null
  // Joins
  klant?: Klant
  facturatie_code?: FacturatieCode
```

- [ ] **Stap 2: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output.

- [ ] **Stap 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: gesplitst_van en gesplitst_naar toevoegen aan Order type"
```

---

### Task 3: DB-functies — bepaalSplitNummer en splitsOrder

**Files:**
- Modify: `src/lib/db/orders.ts`
- Modify: `src/lib/db/orders.test.ts`

- [ ] **Stap 1: Schrijf de failing tests voor `bepaalSplitNummer`**

Voeg onderaan `src/lib/db/orders.test.ts` toe:

```typescript
import { bepaalSplitNummer } from './orders'

describe('bepaalSplitNummer', () => {
  it('geeft A als suffix als er geen gesplitste orders zijn', () => {
    expect(bepaalSplitNummer('ANC26-20260319', [])).toBe('ANC26-20260319A')
  })
  it('geeft B als A al bestaat', () => {
    expect(bepaalSplitNummer('ANC26-20260319', ['ANC26-20260319A'])).toBe('ANC26-20260319B')
  })
  it('geeft C als A en B al bestaan', () => {
    expect(bepaalSplitNummer('ANC26-20260319', ['ANC26-20260319A', 'ANC26-20260319B'])).toBe('ANC26-20260319C')
  })
  it('geeft het eerste beschikbare letter terug (niet op volgorde)', () => {
    expect(bepaalSplitNummer('ORD-001', ['ORD-001B', 'ORD-001A'])).toBe('ORD-001C')
  })
})
```

- [ ] **Stap 2: Run de tests om te zien dat ze falen**

```bash
npx vitest run src/lib/db/orders.test.ts
```

Verwacht: FAIL met "bepaalSplitNummer is not a function"

- [ ] **Stap 3: Voeg `bepaalSplitNummer` toe aan `src/lib/db/orders.ts`**

Voeg toe na de `berekenResterend` functie (rond regel 27):

```typescript
export function bepaalSplitNummer(origineel: string, bestaandeNummers: string[]): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const letter of letters) {
    const kandidaat = `${origineel}${letter}`
    if (!bestaandeNummers.includes(kandidaat)) return kandidaat
  }
  throw new Error('Geen beschikbare split-letter meer (A-Z uitgeput)')
}
```

- [ ] **Stap 4: Run de tests om te zien dat ze slagen**

```bash
npx vitest run src/lib/db/orders.test.ts
```

Verwacht: alle tests PASS

- [ ] **Stap 5: Voeg `splitsOrder` toe aan `src/lib/db/orders.ts`**

Voeg toe onderaan het bestand:

```typescript
export async function splitsOrder(id: string, data: {
  aantal: number
  locatie: string
}): Promise<Order> {
  const supabase = await createClient()

  // Haal origineel order op
  const { data: origineel, error: origError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()
  if (origError) throw origError

  // Valideer: aantal moet tussen 1 en resterend liggen
  const { data: leveringen, error: levError } = await supabase
    .from('leveringen')
    .select('aantal_geleverd')
    .eq('order_id', id)
  if (levError) throw levError
  const totaalGeleverd = (leveringen ?? []).reduce((sum: number, l: any) => sum + l.aantal_geleverd, 0)
  const resterend = Math.max(0, origineel.order_grootte - totaalGeleverd)

  if (data.aantal < 1) throw new Error('Aantal moet minimaal 1 zijn')
  if (data.aantal > resterend) throw new Error(`Maximaal ${resterend} stuks beschikbaar`)
  if (data.locatie === origineel.locatie) throw new Error('Nieuwe locatie moet verschillen van huidige locatie')

  // Bepaal nieuw ordernummer
  const { data: bestaande, error: bestaandeError } = await supabase
    .from('orders')
    .select('order_nummer')
    .like('order_nummer', `${origineel.order_nummer}%`)
  if (bestaandeError) throw bestaandeError
  const bestaandeNummers = (bestaande ?? []).map((o: any) => o.order_nummer)
  const nieuwNummer = bepaalSplitNummer(origineel.order_nummer, bestaandeNummers)

  // Maak nieuw order aan
  const { data: nieuw, error: nieuwError } = await supabase
    .from('orders')
    .insert({
      order_nummer:       nieuwNummer,
      order_code:         origineel.order_code,
      klant_id:           origineel.klant_id,
      facturatie_code_id: origineel.facturatie_code_id,
      order_grootte:      data.aantal,
      aantal_per_doos:    origineel.aantal_per_doos,
      aantal_per_inner:   origineel.aantal_per_inner,
      aantal_per_pallet:  origineel.aantal_per_pallet,
      pallet_type:        origineel.pallet_type,
      bewerking:          origineel.bewerking,
      opwerken:           origineel.opwerken,
      bio:                origineel.bio,
      omschrijving:       origineel.omschrijving,
      deadline:           origineel.deadline,
      tht:                origineel.tht,
      aangemaakt_door:    origineel.aangemaakt_door,
      locatie:            data.locatie,
      status:             'in_behandeling',
      gesplitst_van:      origineel.id,
    })
    .select()
    .single()
  if (nieuwError) throw nieuwError

  // Verlaag origineel en sla verwijzing op
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      order_grootte:  origineel.order_grootte - data.aantal,
      gesplitst_naar: nieuw.id,
    })
    .eq('id', id)
  if (updateError) throw updateError

  return nieuw as Order
}
```

- [ ] **Stap 6: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output.

- [ ] **Stap 7: Run alle tests**

```bash
npx vitest run
```

Verwacht: alle tests PASS.

- [ ] **Stap 8: Commit**

```bash
git add src/lib/db/orders.ts src/lib/db/orders.test.ts
git commit -m "feat: bepaalSplitNummer en splitsOrder toevoegen aan datalaag"
```

---

### Task 4: Server action

**Files:**
- Modify: `src/lib/actions/orders.ts`

- [ ] **Stap 1: Voeg de import toe bovenaan `src/lib/actions/orders.ts`**

Verander:
```typescript
import { updateOrderStatus as dbUpdateOrderStatus, deleteOrder as dbDeleteOrder } from '@/lib/db/orders'
```

naar:
```typescript
import { updateOrderStatus as dbUpdateOrderStatus, deleteOrder as dbDeleteOrder, splitsOrder as dbSplitsOrder } from '@/lib/db/orders'
```

- [ ] **Stap 2: Voeg de server action toe onderaan `src/lib/actions/orders.ts`**

```typescript
export async function splitsOrderAction(id: string, formData: FormData): Promise<void> {
  const aantalRaw = formData.get('aantal') as string
  const locatie = formData.get('locatie') as string
  const aantal = parseInt(aantalRaw, 10)

  if (!aantal || aantal <= 0 || !locatie) return

  const nieuw = await dbSplitsOrder(id, { aantal, locatie })
  revalidatePath(`/orders/${id}`)
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  redirect(`/orders/${nieuw.id}`)
}
```

- [ ] **Stap 3: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output.

- [ ] **Stap 4: Commit**

```bash
git add src/lib/actions/orders.ts
git commit -m "feat: splitsOrderAction server action toevoegen"
```

---

### Task 5: SplitsOrderForm component

**Files:**
- Create: `src/components/orders/SplitsOrderForm.tsx`

Dit is een Client Component omdat het een open/dicht-staat heeft voor het formulier.

- [ ] **Stap 1: Maak het component aan**

```tsx
'use client'

import { useState } from 'react'
import { splitsOrderAction } from '@/lib/actions/orders'
import { LOCATIES } from '@/lib/constants/locaties'

interface Props {
  orderId: string
  resterend: number
  huidigeLocatie: string | null
}

export function SplitsOrderForm({ orderId, resterend, huidigeLocatie }: Props) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-gray-400 hover:text-violet-600 hover:underline"
      >
        Splits order
      </button>
    )
  }

  const andereLocaties = LOCATIES.filter(l => l.waarde !== huidigeLocatie)

  return (
    <form
      action={splitsOrderAction.bind(null, orderId)}
      className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3"
    >
      <div>
        <label className="block text-xs text-gray-500 mb-1">Aantal afsplitsen</label>
        <input
          type="number"
          name="aantal"
          min={1}
          max={resterend}
          required
          className="form-input w-28 text-sm"
          placeholder={`max ${resterend}`}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Naar locatie</label>
        <select name="locatie" required className="form-input text-sm">
          <option value="">Kies locatie…</option>
          {andereLocaties.map(l => (
            <option key={l.waarde} value={l.waarde}>{l.label}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="text-sm bg-violet-600 text-white px-3 py-1.5 rounded-md hover:bg-violet-700 font-medium"
      >
        Splits
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-sm text-gray-400 hover:text-gray-700"
      >
        Annuleren
      </button>
    </form>
  )
}
```

- [ ] **Stap 2: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output.

- [ ] **Stap 3: Commit**

```bash
git add src/components/orders/SplitsOrderForm.tsx
git commit -m "feat: SplitsOrderForm component"
```

---

### Task 6: Orderdetailpagina — splits-knop en verwijzingen

**Files:**
- Modify: `src/app/(app)/orders/[id]/page.tsx`

- [ ] **Stap 1: Voeg de imports toe bovenaan de pagina**

Voeg toe aan de bestaande import-lijst:
```typescript
import { SplitsOrderForm } from '@/components/orders/SplitsOrderForm'
```

En voor de gesplitste order verwijzingen, voeg toe:
```typescript
import { getOrder } from '@/lib/db/orders'
```

`getOrder` is al geïmporteerd, dus alleen `SplitsOrderForm` is nieuw.

- [ ] **Stap 2: Haal gesplitste orders op**

Zoek in de pagina de regel:
```typescript
  const isAfgerond = order.status === 'geleverd' || order.status === 'gefactureerd'
```

Voeg daarna toe:
```typescript
  // Haal gesplitste orders op voor verwijzingen
  const [gesplitstVanOrder, gesplitstNaarOrder] = await Promise.all([
    order.gesplitst_van ? getOrder(order.gesplitst_van) : Promise.resolve(null),
    order.gesplitst_naar ? getOrder(order.gesplitst_naar) : Promise.resolve(null),
  ])
```

- [ ] **Stap 3: Voeg verwijzingen toe in het logistiek-blok**

Zoek het logistiek-blok (bevat "Locatie", "Deadline", "THT"). Na de grid met die drie velden, voeg toe:

```tsx
            {(gesplitstVanOrder || gesplitstNaarOrder) && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-6 text-sm">
                {gesplitstVanOrder && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Gesplitst van</p>
                    <a href={`/orders/${gesplitstVanOrder.id}`} className="font-mono text-xs font-semibold text-violet-600 hover:text-violet-800">
                      {gesplitstVanOrder.order_nummer}
                    </a>
                  </div>
                )}
                {gesplitstNaarOrder && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Gesplitst naar</p>
                    <a href={`/orders/${gesplitstNaarOrder.id}`} className="font-mono text-xs font-semibold text-violet-600 hover:text-violet-800">
                      {gesplitstNaarOrder.order_nummer}
                    </a>
                  </div>
                )}
              </div>
            )}
```

- [ ] **Stap 4: Voeg de splits-knop toe naast de kloon-link**

Zoek:
```tsx
        <Link
          href={`/orders/nieuw?kloon=${id}`}
          className="text-sm text-gray-400 hover:text-violet-600 hover:underline"
        >
          + Kloon deze order
        </Link>
```

Vervang door:
```tsx
        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/orders/nieuw?kloon=${id}`}
            className="text-sm text-gray-400 hover:text-violet-600 hover:underline"
          >
            + Kloon deze order
          </Link>
          {resterend > 0 && (
            <SplitsOrderForm
              orderId={id}
              resterend={resterend}
              huidigeLocatie={order.locatie}
            />
          )}
        </div>
```

- [ ] **Stap 5: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output.

- [ ] **Stap 6: Run alle tests**

```bash
npx vitest run
```

Verwacht: alle tests PASS.

- [ ] **Stap 7: Commit**

```bash
git add "src/app/(app)/orders/[id]/page.tsx" src/components/orders/SplitsOrderForm.tsx
git commit -m "feat: splits-knop en verwijzingen op orderdetailpagina"
```
