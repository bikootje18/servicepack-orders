# Order Artikelen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een optionele "Artikelen" sectie toe aan orders waarmee extra meegeleverde items (omdozen, dollies, bandjes) geregistreerd kunnen worden, met automatische berekening op basis van de order grootte.

**Architecture:** Pure berekeningsfunctie in een util (testbaar via Vitest), DB helpers in `src/lib/db/artikelen.ts`, een client component `ArtikelenForm` dat hidden inputs rendert voor form submission, en integratie in de bestaande server-action forms via inline FormData parsing. Geen aparte server action file — `saveArtikelen` is een gewone async helper die via dynamic import vanuit de bestaande page-level server actions wordt aangeroepen (zelfde patroon als `getOrder` in `nieuw/page.tsx`).

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), TypeScript, Tailwind, Vitest.

---

## File map

| Bestand | Actie | Verantwoordelijkheid |
|---------|-------|----------------------|
| `supabase/migrations/012_order_artikelen.sql` | Aanmaken | DB migratie |
| `src/types/index.ts` | Aanpassen | `OrderArtikel` type toevoegen |
| `src/lib/utils/artikel-berekening.ts` | Aanmaken | Pure berekeningsfunctie |
| `src/lib/utils/artikel-berekening.test.ts` | Aanmaken | Vitest tests |
| `src/lib/db/artikelen.ts` | Aanmaken | DB helpers: get + save |
| `src/components/orders/ArtikelenForm.tsx` | Aanmaken | Client component: toggle, rijen, live berekening |
| `src/app/(app)/orders/nieuw/page.tsx` | Aanpassen | Auto-kopie + ArtikelenForm + opslaan |
| `src/app/(app)/orders/[id]/bewerken/page.tsx` | Aanpassen | Bestaande artikelen + ArtikelenForm + opslaan |
| `src/app/(app)/orders/[id]/page.tsx` | Aanpassen | Read-only artikelentabel |

---

### Task 1: Migratie + type

**Files:**
- Create: `supabase/migrations/012_order_artikelen.sql`
- Modify: `src/types/index.ts`

- [ ] **Stap 1: Schrijf de migratie**

```sql
-- supabase/migrations/012_order_artikelen.sql

CREATE TABLE order_artikelen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  naam text NOT NULL,
  berekening_type text NOT NULL CHECK (berekening_type IN ('delen', 'vermenigvuldigen')),
  factor numeric(10,4) NOT NULL CHECK (factor > 0),
  volgorde integer NOT NULL DEFAULT 0,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_artikelen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can manage order_artikelen"
  ON order_artikelen FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
```

- [ ] **Stap 2: Voeg het type toe aan `src/types/index.ts`**

Voeg toe na de `OrderBijlage` interface (na regel 115):

```typescript
export interface OrderArtikel {
  id: string
  order_id: string
  naam: string
  berekening_type: 'delen' | 'vermenigvuldigen'
  factor: number
  volgorde: number
  aangemaakt_op: string
}
```

- [ ] **Stap 3: Commit**

```bash
git add supabase/migrations/012_order_artikelen.sql src/types/index.ts
git commit -m "feat: order_artikelen migratie en type"
```

---

### Task 2: Berekeningsfunctie (TDD)

**Files:**
- Create: `src/lib/utils/artikel-berekening.ts`
- Create: `src/lib/utils/artikel-berekening.test.ts`

- [ ] **Stap 1: Schrijf de tests EERST**

```typescript
// src/lib/utils/artikel-berekening.test.ts
import { describe, it, expect } from 'vitest'
import { berekenAantal } from './artikel-berekening'

describe('berekenAantal', () => {
  describe('delen', () => {
    it('deelt en rondt naar boven af', () => {
      expect(berekenAantal(100, 'delen', 50)).toBe(2)
      expect(berekenAantal(101, 'delen', 50)).toBe(3)
    })

    it('rondt altijd naar boven — nooit naar beneden', () => {
      expect(berekenAantal(100, 'delen', 3)).toBe(34) // 100/3 = 33.3 → 34
    })

    it('geeft 1 terug als order_grootte kleiner is dan factor', () => {
      expect(berekenAantal(10, 'delen', 50)).toBe(1) // ceil(10/50) = 1
    })
  })

  describe('vermenigvuldigen', () => {
    it('vermenigvuldigt en rondt naar dichtstbijzijnde af', () => {
      expect(berekenAantal(100, 'vermenigvuldigen', 2)).toBe(200)
      expect(berekenAantal(100, 'vermenigvuldigen', 0.5)).toBe(50)
    })

    it('rondt 0.5 naar boven', () => {
      expect(berekenAantal(1, 'vermenigvuldigen', 1.5)).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('geeft null terug als orderGrootte null is', () => {
      expect(berekenAantal(null, 'delen', 50)).toBeNull()
    })

    it('geeft null terug als factor 0 is', () => {
      expect(berekenAantal(100, 'delen', 0)).toBeNull()
    })
  })
})
```

- [ ] **Stap 2: Draai tests — verwacht FAIL**

```bash
npm run test:run -- artikel-berekening
```

Expected: FAIL — "cannot find module".

- [ ] **Stap 3: Schrijf de implementatie**

```typescript
// src/lib/utils/artikel-berekening.ts

export function berekenAantal(
  orderGrootte: number | null,
  type: 'delen' | 'vermenigvuldigen',
  factor: number
): number | null {
  if (orderGrootte == null || factor <= 0) return null
  if (type === 'delen') return Math.ceil(orderGrootte / factor)
  return Math.round(orderGrootte * factor)
}
```

- [ ] **Stap 4: Draai tests — verwacht PASS**

```bash
npm run test:run -- artikel-berekening
```

Expected: 7/7 groen.

- [ ] **Stap 5: Commit**

```bash
git add src/lib/utils/artikel-berekening.ts src/lib/utils/artikel-berekening.test.ts
git commit -m "feat: artikel berekeningsfunctie met tests"
```

---

### Task 3: DB helpers

**Files:**
- Create: `src/lib/db/artikelen.ts`

- [ ] **Stap 1: Schrijf de DB helpers**

```typescript
// src/lib/db/artikelen.ts
import { createClient } from '@/lib/supabase/server'
import type { OrderArtikel } from '@/types'

export async function getArtikelenVoorOrder(orderId: string): Promise<OrderArtikel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('order_artikelen')
    .select('*')
    .eq('order_id', orderId)
    .order('volgorde', { ascending: true })
  if (error) throw error
  return (data ?? []) as OrderArtikel[]
}

export async function getLaatsteArtikelenVoorKlant(klantId: string): Promise<OrderArtikel[]> {
  const supabase = await createClient()

  // Haal de laatste 20 orders op voor deze klant, inclusief hun artikelen
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_artikelen(*)')
    .eq('klant_id', klantId)
    .order('aangemaakt_op', { ascending: false })
    .limit(20)
  if (error) throw error

  // Zoek de meest recente order met minimaal één artikel
  for (const order of (orders ?? [])) {
    const artikelen = (order.order_artikelen ?? []) as OrderArtikel[]
    if (artikelen.length > 0) {
      return artikelen.sort((a, b) => a.volgorde - b.volgorde)
    }
  }
  return []
}

export async function saveArtikelen(
  orderId: string,
  regels: Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }>
): Promise<void> {
  const supabase = await createClient()

  const { error: deleteError } = await supabase
    .from('order_artikelen')
    .delete()
    .eq('order_id', orderId)
  if (deleteError) throw deleteError

  if (regels.length === 0) return

  const { error: insertError } = await supabase
    .from('order_artikelen')
    .insert(
      regels.map((r, i) => ({
        order_id: orderId,
        naam: r.naam,
        berekening_type: r.berekening_type,
        factor: r.factor,
        volgorde: i,
      }))
    )
  if (insertError) throw insertError
}
```

- [ ] **Stap 2: Draai alle tests**

```bash
npm run test:run
```

Expected: alle tests groen (geen regressies).

- [ ] **Stap 3: Commit**

```bash
git add src/lib/db/artikelen.ts
git commit -m "feat: artikelen DB helpers"
```

---

### Task 4: ArtikelenForm component

**Files:**
- Create: `src/components/orders/ArtikelenForm.tsx`

De component rendert hidden inputs die worden meegestuurd met de bestaande order form. De server action leest deze hidden inputs uit via FormData.

**FormData protocol:**
- `artikelen_geopend`: `"true"` of `"false"` — geeft aan of de sectie open was bij submit
- `artikelen_count`: aantal rijen (alleen aanwezig als `artikelen_geopend === "true"`)
- `artikel_naam_0`, `artikel_type_0`, `artikel_factor_0`, ... per rij (0-indexed)

De server action roept `saveArtikelen` alleen aan als `artikelen_geopend === "true"`.

- [ ] **Stap 1: Schrijf het component**

```tsx
// src/components/orders/ArtikelenForm.tsx
'use client'
import { useState, useEffect } from 'react'
import { berekenAantal } from '@/lib/utils/artikel-berekening'
import type { OrderArtikel } from '@/types'

interface ArtikelRij {
  naam: string
  berekening_type: 'delen' | 'vermenigvuldigen'
  factor: string
}

interface Props {
  initialArtikelen: Pick<OrderArtikel, 'naam' | 'berekening_type' | 'factor'>[]
  defaultOrderGrootte: number | null
}

export function ArtikelenForm({ initialArtikelen, defaultOrderGrootte }: Props) {
  const [open, setOpen] = useState(initialArtikelen.length > 0)
  const [regels, setRegels] = useState<ArtikelRij[]>(
    initialArtikelen.map(a => ({
      naam: a.naam,
      berekening_type: a.berekening_type,
      factor: String(a.factor),
    }))
  )
  const [orderGrootte, setOrderGrootte] = useState<number | null>(defaultOrderGrootte)

  // Luister naar wijzigingen in het order_grootte invoerveld in de parent form
  useEffect(() => {
    const input = document.querySelector('input[name="order_grootte"]') as HTMLInputElement | null
    if (!input) return
    const handler = () => {
      const val = parseInt(input.value)
      setOrderGrootte(isNaN(val) ? null : val)
    }
    input.addEventListener('input', handler)
    return () => input.removeEventListener('input', handler)
  }, [])

  function voegToe() {
    setRegels(prev => [...prev, { naam: '', berekening_type: 'delen', factor: '' }])
  }

  function verwijder(i: number) {
    setRegels(prev => prev.filter((_, idx) => idx !== i))
  }

  function update(i: number, veld: keyof ArtikelRij, waarde: string) {
    setRegels(prev => prev.map((r, idx) => idx === i ? { ...r, [veld]: waarde } : r))
  }

  function toonAantal(r: ArtikelRij): string {
    const factor = parseFloat(r.factor)
    if (isNaN(factor)) return '—'
    const result = berekenAantal(orderGrootte, r.berekening_type, factor)
    return result == null ? '—' : String(result)
  }

  return (
    <div>
      {/* Hidden inputs voor form submission */}
      <input type="hidden" name="artikelen_geopend" value={open ? 'true' : 'false'} />
      {open && (
        <>
          <input type="hidden" name="artikelen_count" value={String(regels.length)} />
          {regels.map((r, i) => (
            <span key={i}>
              <input type="hidden" name={`artikel_naam_${i}`} value={r.naam} />
              <input type="hidden" name={`artikel_type_${i}`} value={r.berekening_type} />
              <input type="hidden" name={`artikel_factor_${i}`} value={r.factor} />
            </span>
          ))}
        </>
      )}

      {/* Header met toggle */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-700">Artikelen</span>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {open ? 'Verbergen' : (regels.length > 0 ? `${regels.length} artikel(en)` : 'Toevoegen')}
        </button>
      </div>

      {open && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {regels.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Naam</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Type</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-500 text-xs">Factor</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-500 text-xs">Aantal</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {regels.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        value={r.naam}
                        onChange={e => update(i, 'naam', e.target.value)}
                        className="form-input text-sm"
                        placeholder="bijv. ser8030"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <select
                        value={r.berekening_type}
                        onChange={e => update(i, 'berekening_type', e.target.value)}
                        className="form-select text-sm"
                      >
                        <option value="delen">Delen</option>
                        <option value="vermenigvuldigen">Vermenigvuldigen</option>
                      </select>
                    </td>
                    <td className="px-3 py-1.5">
                      <input
                        type="number"
                        min="0.0001"
                        step="any"
                        value={r.factor}
                        onChange={e => update(i, 'factor', e.target.value)}
                        className="form-input text-sm w-24"
                        placeholder="bijv. 50"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 font-medium">
                      {toonAantal(r)}
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => verwijder(i)}
                        className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                        aria-label="Verwijder"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="px-3 py-2 border-t border-gray-100">
            <button
              type="button"
              onClick={voegToe}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Artikel toevoegen
            </button>
          </div>
        </div>
      )}
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
git add src/components/orders/ArtikelenForm.tsx
git commit -m "feat: ArtikelenForm client component"
```

---

### Task 5: Integreer in order aanmaken

**Files:**
- Modify: `src/app/(app)/orders/nieuw/page.tsx`

**Importpatroon:** Gebruik dynamic imports voor `artikelen.ts` (zelfde patroon als de bestaande dynamic import van `getOrder`). De FormData parse helper wordt direct inline geschreven in de server action — geen module-scope helper functie.

- [ ] **Stap 1: Voeg import toe en auto-kopie logica**

Voeg toe aan de imports bovenaan:

```typescript
import { ArtikelenForm } from '@/components/orders/ArtikelenForm'
```

Wijzig de searchParams type definitie:

```typescript
searchParams: Promise<{ kloon?: string; zoek?: string; klant_id?: string }>
```

Voeg toe na het `kloonOrder` blok (na regel 32 van de huidige file), nog steeds vóór de server action definitie:

```typescript
// Auto-kopie artikelen: kloon heeft voorrang boven klant_id auto-kopie
let initialArtikelen: import('@/types').OrderArtikel[] = []
if (kloonOrder) {
  const { getArtikelenVoorOrder } = await import('@/lib/db/artikelen')
  initialArtikelen = await getArtikelenVoorOrder(kloonOrder.id)
} else if (params.klant_id) {
  const { getLaatsteArtikelenVoorKlant } = await import('@/lib/db/artikelen')
  initialArtikelen = await getLaatsteArtikelenVoorKlant(params.klant_id)
}
```

- [ ] **Stap 2: Voeg artikel-opslag toe in `slaOrderOp`**

Voeg toe in de bestaande `slaOrderOp` server action, direct **na** `const order = await createOrder(...)` en **vóór** `redirect(...)`:

```typescript
// Artikelen opslaan als de sectie geopend was bij submit
if (formData.get('artikelen_geopend') === 'true') {
  const count = parseInt(formData.get('artikelen_count') as string ?? '0')
  const regels: Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }> = []
  for (let i = 0; i < count; i++) {
    const naam = (formData.get(`artikel_naam_${i}`) as string ?? '').trim()
    const type = formData.get(`artikel_type_${i}`) as string
    const factor = parseFloat(formData.get(`artikel_factor_${i}`) as string ?? '0')
    if (naam && (type === 'delen' || type === 'vermenigvuldigen') && factor > 0) {
      regels.push({ naam, berekening_type: type as 'delen' | 'vermenigvuldigen', factor })
    }
  }
  const { saveArtikelen } = await import('@/lib/db/artikelen')
  await saveArtikelen(order.id, regels)
}
```

- [ ] **Stap 3: Voeg `ArtikelenForm` toe in de JSX**

Voeg toe vóór de `<div className="flex gap-3">` met de submit knoppen:

```tsx
<ArtikelenForm
  initialArtikelen={initialArtikelen}
  defaultOrderGrootte={v?.order_grootte ?? null}
/>
```

- [ ] **Stap 4: Draai alle tests**

```bash
npm run test:run
```

Expected: alle tests groen.

- [ ] **Stap 5: Commit**

```bash
git add src/app/\(app\)/orders/nieuw/page.tsx
git commit -m "feat: artikelen integratie in order aanmaken"
```

---

### Task 6: Integreer in order bewerken

**Files:**
- Modify: `src/app/(app)/orders/[id]/bewerken/page.tsx`

- [ ] **Stap 1: Voeg import toe**

Voeg toe aan de imports:

```typescript
import { getArtikelenVoorOrder } from '@/lib/db/artikelen'
import { ArtikelenForm } from '@/components/orders/ArtikelenForm'
```

- [ ] **Stap 2: Haal artikelen op bij page load**

Wijzig de `Promise.all` aanroep:

```typescript
const [order, klanten, codes, artikelen] = await Promise.all([
  getOrder(id),
  getKlanten(),
  getCodes(),
  getArtikelenVoorOrder(id),
])
```

- [ ] **Stap 3: Voeg artikel-opslag toe in `slaOpgeslagenOp`**

Voeg toe in de bestaande `slaOpgeslagenOp` server action, direct **na** `await updateOrder(...)` en **vóór** `redirect(...)`:

```typescript
// Artikelen opslaan als de sectie geopend was bij submit
if (formData.get('artikelen_geopend') === 'true') {
  const count = parseInt(formData.get('artikelen_count') as string ?? '0')
  const regels: Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }> = []
  for (let i = 0; i < count; i++) {
    const naam = (formData.get(`artikel_naam_${i}`) as string ?? '').trim()
    const type = formData.get(`artikel_type_${i}`) as string
    const factor = parseFloat(formData.get(`artikel_factor_${i}`) as string ?? '0')
    if (naam && (type === 'delen' || type === 'vermenigvuldigen') && factor > 0) {
      regels.push({ naam, berekening_type: type as 'delen' | 'vermenigvuldigen', factor })
    }
  }
  const { saveArtikelen } = await import('@/lib/db/artikelen')
  await saveArtikelen(id, regels)
}
```

- [ ] **Stap 4: Voeg `ArtikelenForm` toe in de JSX**

Voeg toe vóór de `<div className="flex gap-3">` met de submit knoppen:

```tsx
<ArtikelenForm
  initialArtikelen={artikelen}
  defaultOrderGrootte={order.order_grootte}
/>
```

- [ ] **Stap 5: Draai alle tests**

```bash
npm run test:run
```

Expected: alle tests groen.

- [ ] **Stap 6: Commit**

```bash
git add src/app/\(app\)/orders/\[id\]/bewerken/page.tsx
git commit -m "feat: artikelen integratie in order bewerken"
```

---

### Task 7: Order detailpagina

**Files:**
- Modify: `src/app/(app)/orders/[id]/page.tsx`

- [ ] **Stap 1: Voeg imports toe**

Voeg toe aan de imports:

```typescript
import { getArtikelenVoorOrder } from '@/lib/db/artikelen'
import { berekenAantal } from '@/lib/utils/artikel-berekening'
```

- [ ] **Stap 2: Haal artikelen op**

Wijzig de `Promise.all` (huidige regel 27):

```typescript
const [leveringen, bijlagen, artikelen] = await Promise.all([
  getLeveringen(id),
  getBijlagen(id),
  getArtikelenVoorOrder(id),
])
```

- [ ] **Stap 3: Voeg artikelentabel toe in de JSX**

Plaats de tabel **na** het afgerond banner blok (na de sluitende `</div>` van het `bg-green-50` banner, huidige ~regel 93) en **na** de clone link `<div className="mb-6">` (huidige ~regel 100), maar **vóór** `<h2 className="text-lg font-semibold mb-3">Gereedmeldingen</h2>`:

```tsx
{artikelen.length > 0 && (
  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
    <h2 className="text-sm font-semibold text-gray-700 mb-3">Artikelen</h2>
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="text-left pb-2 font-medium text-gray-500 text-xs">Naam</th>
          <th className="text-left pb-2 font-medium text-gray-500 text-xs">Type</th>
          <th className="text-left pb-2 font-medium text-gray-500 text-xs">Factor</th>
          <th className="text-right pb-2 font-medium text-gray-500 text-xs">Aantal</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {artikelen.map(a => {
          const aantal = berekenAantal(order.order_grootte, a.berekening_type, a.factor)
          return (
            <tr key={a.id}>
              <td className="py-1.5 font-mono text-xs">{a.naam}</td>
              <td className="py-1.5 text-gray-500 text-xs capitalize">{a.berekening_type}</td>
              <td className="py-1.5 text-gray-500 text-xs">{a.factor}</td>
              <td className="py-1.5 text-right tabular-nums font-medium">{aantal ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)}
```

- [ ] **Stap 4: Draai alle tests**

```bash
npm run test:run
```

Expected: alle tests groen.

- [ ] **Stap 5: Commit**

```bash
git add src/app/\(app\)/orders/\[id\]/page.tsx
git commit -m "feat: artikelen weergave op order detailpagina"
```

---

## Done

Na Task 7 is de feature compleet:
- Artikelen toggle op order aanmaken + bewerken
- Auto-kopie van vorige order van dezelfde klant (of van gekloonde order)
- Live berekening op basis van order grootte
- Read-only weergave op de detailpagina
