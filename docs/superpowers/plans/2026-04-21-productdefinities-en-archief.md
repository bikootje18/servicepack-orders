# Productdefinities Lookup & Order Archief — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import productdefinities uit Excel naar Supabase, voeg autocomplete lookup toe aan het orderformulier, en maak een archief-filter op de orders-pagina.

**Architecture:** Nieuwe `productdefinities` tabel in Supabase gevuld via een import script. Het orderformulier krijgt een autocomplete op het `order_code` veld dat via een server action zoekt in de productdefinities en de ordervelden invult. De orders-pagina krijgt Actief/Archief tabs, gefilterd via een subquery op gekoppelde vrachten.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL), xlsx package (al geïnstalleerd)

---

## File Structure

| File | Verantwoordelijkheid |
|---|---|
| `supabase/migrations/028_productdefinities.sql` | Database tabel + RLS |
| `scripts/import-productdefinities.ts` | Excel → Supabase import |
| `src/types/index.ts` | `Productdefinitie` type toevoegen |
| `src/lib/db/productdefinities.ts` | Database queries voor productdefinities |
| `src/lib/actions/productdefinities.ts` | Server action voor autocomplete |
| `src/components/orders/ProductLookup.tsx` | Autocomplete component |
| `src/components/orders/OrderFormulier.tsx` | Integratie ProductLookup + auto-fill |
| `src/lib/db/orders.ts` | Archief filter in getOrders() |
| `src/app/(app)/orders/page.tsx` | Actief/Archief tabs |

---

### Task 1: Database migratie voor productdefinities

**Files:**
- Create: `supabase/migrations/028_productdefinities.sql`

- [ ] **Step 1: Schrijf de migratie**

```sql
-- supabase/migrations/028_productdefinities.sql

CREATE TABLE productdefinities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publiceren boolean NOT NULL DEFAULT true,
  art_nr text NOT NULL UNIQUE,
  omschrijving_eindproduct text NOT NULL DEFAULT '',
  art_grondstof text NOT NULL DEFAULT '',
  omschrijving_grondstof text NOT NULL DEFAULT '',
  grondstof_per_he numeric(10,6) NOT NULL DEFAULT 0,
  tray_1_code text NOT NULL DEFAULT '',
  tray_1_per_he integer NOT NULL DEFAULT 0,
  tray_1_omschrijving text NOT NULL DEFAULT '',
  tray_2_code text NOT NULL DEFAULT '',
  tray_2_per_he integer NOT NULL DEFAULT 0,
  tray_2_omschrijving text NOT NULL DEFAULT '',
  ean_he text NOT NULL DEFAULT '',
  label_1_per_he integer NOT NULL DEFAULT 0,
  ean_ce text NOT NULL DEFAULT '',
  label_2_per_he integer NOT NULL DEFAULT 0,
  per_laag integer NOT NULL DEFAULT 0,
  lagen integer NOT NULL DEFAULT 0,
  per_pallet integer NOT NULL DEFAULT 0,
  lading_drager text NOT NULL DEFAULT '',
  tussenlegvel boolean NOT NULL DEFAULT false,
  hoekprofiel boolean NOT NULL DEFAULT false,
  spiegelen boolean NOT NULL DEFAULT false,
  tarief_service_pack numeric(10,5) NOT NULL DEFAULT 0,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE productdefinities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated users can read productdefinities"
  ON productdefinities FOR SELECT TO authenticated
  USING (true);
```

- [ ] **Step 2: Voer de migratie uit op Supabase**

Run: `npx supabase db push` of voer de SQL handmatig uit in de Supabase SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/028_productdefinities.sql
git commit -m "feat: add productdefinities table migration"
```

---

### Task 2: TypeScript type voor Productdefinitie

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Voeg het Productdefinitie type toe**

Voeg onderaan `src/types/index.ts` toe:

```typescript
export interface Productdefinitie {
  id: string
  publiceren: boolean
  art_nr: string
  omschrijving_eindproduct: string
  art_grondstof: string
  omschrijving_grondstof: string
  grondstof_per_he: number
  tray_1_code: string
  tray_1_per_he: number
  tray_1_omschrijving: string
  tray_2_code: string
  tray_2_per_he: number
  tray_2_omschrijving: string
  ean_he: string
  label_1_per_he: number
  ean_ce: string
  label_2_per_he: number
  per_laag: number
  lagen: number
  per_pallet: number
  lading_drager: string
  tussenlegvel: boolean
  hoekprofiel: boolean
  spiegelen: boolean
  tarief_service_pack: number
  aangemaakt_op: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Productdefinitie type"
```

---

### Task 3: Import script

**Files:**
- Create: `scripts/import-productdefinities.ts`

- [ ] **Step 1: Schrijf het import script**

```typescript
// scripts/import-productdefinities.ts
//
// Gebruik: npx tsx scripts/import-productdefinities.ts "Productdefinities 20260420.xlsx"
//
// Vereist env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Stel NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in')
  process.exit(1)
}

const file = process.argv[2]
if (!file) {
  console.error('Gebruik: npx tsx scripts/import-productdefinities.ts <excel-bestand>')
  process.exit(1)
}

const supabase = createClient(url, key)

const wb = XLSX.read(readFileSync(file))
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

console.log(`${rows.length} rijen gevonden in ${file}`)

const records = rows
  .filter(r => r['Art Nr'] != null)
  .map(r => ({
    publiceren: r['Publiceren'] === 'x',
    art_nr: String(r['Art Nr']),
    omschrijving_eindproduct: String(r['Omschrijving eindproduct'] ?? ''),
    art_grondstof: String(r['Art Grondstof'] ?? ''),
    omschrijving_grondstof: String(r['Omschrijving grondstof'] ?? ''),
    grondstof_per_he: Number(r['# Grondstof / HE'] ?? 0),
    tray_1_code: String(r['Tray 1 (1x)'] ?? ''),
    tray_1_per_he: Number(r['# Tray 1 / HE'] ?? 0),
    tray_1_omschrijving: String(r['Omschrijving Tray 1'] ?? ''),
    tray_2_code: String(r['Tray 2 (3x)'] ?? ''),
    tray_2_per_he: Number(r['# Tray 2 / HE'] ?? 0),
    tray_2_omschrijving: String(r['Omschrijving Tray 2'] ?? ''),
    ean_he: String(r['EAN HE (EAN-14)'] ?? ''),
    label_1_per_he: Number(r['# Label 1 / HE'] ?? 0),
    ean_ce: String(r['EAN CE (3x) (EAN-13)'] ?? ''),
    label_2_per_he: Number(r['# Label 2 / HE'] ?? 0),
    per_laag: Number(r['# / laag'] ?? 0),
    lagen: Number(r['# lagen'] ?? 0),
    per_pallet: Number(r['# / pallet'] ?? 0),
    lading_drager: String(r['Lading drager'] ?? ''),
    tussenlegvel: r['Tussenlegvel'] === 'X',
    hoekprofiel: r['Hoekprofiel'] === 'X',
    spiegelen: r['Spiegelen'] === 'X',
    tarief_service_pack: Number(r['Totaal tarief Service Pack'] ?? 0),
  }))

console.log(`${records.length} geldige records om te importeren`)

// Upsert in batches van 50
const BATCH = 50
let imported = 0
for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH)
  const { error } = await supabase
    .from('productdefinities')
    .upsert(batch, { onConflict: 'art_nr' })
  if (error) {
    console.error(`Fout bij batch ${i}:`, error.message)
    process.exit(1)
  }
  imported += batch.length
  console.log(`${imported}/${records.length} geïmporteerd...`)
}

console.log(`Klaar! ${imported} productdefinities geïmporteerd.`)
```

- [ ] **Step 2: Test het script**

Run: `SUPABASE_SERVICE_ROLE_KEY=<key> npx tsx scripts/import-productdefinities.ts "Productdefinities 20260420.xlsx"`

Verwacht: output met het aantal geïmporteerde records, geen errors.

- [ ] **Step 3: Verifieer in Supabase**

Controleer in de Supabase Table Editor dat de `productdefinities` tabel gevuld is. Steekproef: zoek art_nr `200281` en controleer dat omschrijving "De Koninck Bolleke 8x33 cl" is.

- [ ] **Step 4: Commit**

```bash
git add scripts/import-productdefinities.ts
git commit -m "feat: add productdefinities import script"
```

---

### Task 4: Database query voor productdefinities

**Files:**
- Create: `src/lib/db/productdefinities.ts`

- [ ] **Step 1: Schrijf de zoekfunctie**

```typescript
// src/lib/db/productdefinities.ts
import { createClient } from '@/lib/supabase/server'
import type { Productdefinitie } from '@/types'

export async function zoekProductdefinities(zoekterm: string): Promise<Productdefinitie[]> {
  if (!zoekterm || zoekterm.trim().length < 2) return []

  const supabase = await createClient()
  const term = zoekterm.trim()

  const { data, error } = await supabase
    .from('productdefinities')
    .select('*')
    .eq('publiceren', true)
    .or(`art_nr.ilike.%${term}%,omschrijving_eindproduct.ilike.%${term}%`)
    .order('art_nr')
    .limit(8)

  if (error) throw new Error(`[zoekProductdefinities] ${error.message}`)
  return (data ?? []) as Productdefinitie[]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/productdefinities.ts
git commit -m "feat: add productdefinities search query"
```

---

### Task 5: Server action voor autocomplete

**Files:**
- Create: `src/lib/actions/productdefinities.ts`

- [ ] **Step 1: Schrijf de server action**

```typescript
// src/lib/actions/productdefinities.ts
'use server'

import { zoekProductdefinities } from '@/lib/db/productdefinities'
import type { Productdefinitie } from '@/types'

export async function zoekProductdefAction(zoekterm: string): Promise<Productdefinitie[]> {
  return zoekProductdefinities(zoekterm)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/productdefinities.ts
git commit -m "feat: add productdefinities server action"
```

---

### Task 6: ProductLookup autocomplete component

**Files:**
- Create: `src/components/orders/ProductLookup.tsx`

- [ ] **Step 1: Schrijf de ProductLookup component**

```tsx
// src/components/orders/ProductLookup.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { zoekProductdefAction } from '@/lib/actions/productdefinities'
import type { Productdefinitie, PalletType } from '@/types'

const LADING_DRAGER_MAP: Record<string, PalletType> = {
  CHEP100: 'chep',
  CHEP80: 'chep',
  EURO: 'euro',
  DPB: 'geen',
  DOLLY: 'geen',
}

export interface ProductLookupResult {
  order_code: string
  omschrijving: string
  aantal_per_pallet: number
  pallet_type: PalletType
  artikelen: Array<{
    naam: string
    berekening_type: 'delen' | 'vermenigvuldigen'
    factor: number
  }>
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (result: ProductLookupResult) => void
}

export function ProductLookup({ value, onChange, onSelect }: Props) {
  const [resultaten, setResultaten] = useState<Productdefinitie[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (value.trim().length < 2) {
      setResultaten([])
      setOpen(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      const data = await zoekProductdefAction(value.trim())
      setResultaten(data)
      setOpen(data.length > 0)
      setLoading(false)
    }, 300)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value])

  // Sluit dropdown bij klik buiten
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selecteer(pd: Productdefinitie) {
    const artikelen: ProductLookupResult['artikelen'] = []

    if (pd.tray_1_code && pd.tray_1_per_he > 0) {
      artikelen.push({
        naam: `BSB${pd.tray_1_code} ${pd.tray_1_omschrijving}`.trim(),
        berekening_type: 'vermenigvuldigen',
        factor: pd.tray_1_per_he,
      })
    }
    if (pd.tray_2_code && pd.tray_2_per_he > 0) {
      artikelen.push({
        naam: `BSB${pd.tray_2_code} ${pd.tray_2_omschrijving}`.trim(),
        berekening_type: 'vermenigvuldigen',
        factor: pd.tray_2_per_he,
      })
    }

    const omschrijvingParts = [
      `${pd.art_nr} ${pd.omschrijving_eindproduct}`,
    ]
    if (pd.per_laag && pd.lagen) {
      omschrijvingParts.push(`Per ${pd.per_laag}x${pd.lagen} = ${pd.per_pallet}`)
    }
    if (pd.ean_he) {
      omschrijvingParts.push(`EAN = ${pd.ean_he}`)
    }

    onSelect({
      order_code: pd.art_nr,
      omschrijving: omschrijvingParts.join('\n'),
      aantal_per_pallet: pd.per_pallet,
      pallet_type: LADING_DRAGER_MAP[pd.lading_drager] ?? 'geen',
      artikelen,
    })

    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Order code *</label>
      <input
        name="order_code"
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => { if (resultaten.length > 0) setOpen(true) }}
        className="form-input"
        placeholder="Typ artikelcode of naam..."
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-[2.1rem] text-xs text-gray-400">Zoeken...</div>
      )}

      {open && resultaten.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {resultaten.map(pd => (
            <button
              key={pd.id}
              type="button"
              onClick={() => selecteer(pd)}
              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
            >
              <span className="font-mono text-xs font-bold text-gray-900 w-16 flex-shrink-0">
                {pd.art_nr}
              </span>
              <span className="text-sm text-gray-600 truncate">
                {pd.omschrijving_eindproduct}
              </span>
              <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                {pd.per_pallet}/pallet
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/orders/ProductLookup.tsx
git commit -m "feat: add ProductLookup autocomplete component"
```

---

### Task 7: Integratie ProductLookup in OrderFormulier

**Files:**
- Modify: `src/components/orders/OrderFormulier.tsx`
- Modify: `src/components/orders/ArtikelenForm.tsx`

- [ ] **Step 1: Voeg import en onProductSelect handler toe aan OrderFormulier**

In `src/components/orders/OrderFormulier.tsx`, voeg de import toe bovenaan:

```typescript
import { ProductLookup } from './ProductLookup'
import type { ProductLookupResult } from './ProductLookup'
```

- [ ] **Step 2: Voeg artikelen state toe aan OrderFormulier**

Voeg na de `const [v, setV] = useState(...)` een state toe voor de artikelen die ArtikelenForm kan ontvangen:

```typescript
const [artikelenVanLookup, setArtikelenVanLookup] = useState<
  Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }>
>([])
```

- [ ] **Step 3: Voeg de onProductSelect handler toe**

Voeg na de `setCheck` functie een handler toe:

```typescript
function onProductSelect(result: ProductLookupResult) {
  setV(prev => ({
    ...prev,
    order_code: result.order_code,
    omschrijving: result.omschrijving,
    aantal_per_pallet: String(result.aantal_per_pallet),
    pallet_type: result.pallet_type,
  }))
  setArtikelenVanLookup(result.artikelen)
}
```

- [ ] **Step 4: Vervang het order_code input veld met ProductLookup**

Vervang in de JSX het bestaande order_code `<div>` blok:

```tsx
{/* Oud */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Order code *</label>
  <input name="order_code" required value={v.order_code} onChange={set('order_code')}
    className="form-input" />
</div>
```

Met:

```tsx
{/* Nieuw */}
<ProductLookup
  value={v.order_code}
  onChange={(val) => setV(prev => ({ ...prev, order_code: val }))}
  onSelect={onProductSelect}
/>
```

- [ ] **Step 5: Geef artikelenVanLookup door aan ArtikelenForm**

Pas de ArtikelenForm aanroep aan:

```tsx
<ArtikelenForm
  initialArtikelen={initialArtikelen}
  defaultOrderGrootte={init?.order_grootte ?? null}
  lookupArtikelen={artikelenVanLookup}
/>
```

- [ ] **Step 6: Pas ArtikelenForm aan om lookupArtikelen te accepteren**

In `src/components/orders/ArtikelenForm.tsx`:

Voeg `lookupArtikelen` toe aan de Props interface:

```typescript
interface Props {
  initialArtikelen: Pick<OrderArtikel, 'naam' | 'berekening_type' | 'factor'>[]
  defaultOrderGrootte: number | null
  lookupArtikelen?: Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }>
}
```

Voeg de prop toe aan de functie signature:

```typescript
export function ArtikelenForm({ initialArtikelen, defaultOrderGrootte, lookupArtikelen }: Props) {
```

Voeg een useEffect toe die lookupArtikelen verwerkt (na de bestaande useEffect):

```typescript
useEffect(() => {
  if (!lookupArtikelen || lookupArtikelen.length === 0) return
  setRegels(lookupArtikelen.map(a => ({
    naam: a.naam,
    berekening_type: a.berekening_type,
    factor: String(a.factor),
  })))
  setOpen(true)
}, [lookupArtikelen])
```

- [ ] **Step 7: Test handmatig**

Run: `npm run dev`

1. Ga naar `/orders/nieuw`
2. Typ `200281` in het order_code veld
3. Verwacht: dropdown met "200281 — De Koninck Bolleke 8x33 cl"
4. Klik erop
5. Verwacht: omschrijving, aantal_per_pallet (186), pallet_type (chep) worden ingevuld
6. Verwacht: artikelen sectie opent met tray "BSB260202 tray wit 245x125x38mm"

- [ ] **Step 8: Commit**

```bash
git add src/components/orders/OrderFormulier.tsx src/components/orders/ArtikelenForm.tsx
git commit -m "feat: integrate ProductLookup autocomplete in order form"
```

---

### Task 8: Order archief — getOrders aanpassen

**Files:**
- Modify: `src/lib/db/orders.ts`

- [ ] **Step 1: Voeg archief parameter toe aan getOrders**

In `src/lib/db/orders.ts`, pas de `getOrders` functie signature aan:

```typescript
export async function getOrders(
  page = 1,
  perPagina = 50,
  zoek?: string,
  archief = false,
): Promise<{ orders: Order[]; totaal: number }> {
```

- [ ] **Step 2: Voeg het archief filter toe**

Na de zoek-filter (`if (zoek && zoek.trim()) { ... }`), voeg toe:

```typescript
if (archief) {
  // Orders die WEL een levering in een vracht hebben
  query = query.filter('leveringen.vracht_regels.vracht_id', 'not.is', null)
} else {
  // Orders die GEEN levering in een vracht hebben
  // We gebruiken een NOT EXISTS via een RPC of een andere benadering
}
```

**Opmerking:** Supabase's PostgREST heeft beperkingen met NOT EXISTS subqueries. De betrouwbaarste aanpak is een database view of RPC. We gebruiken een eenvoudiger alternatief: een `heeft_vracht` boolean kolom op orders, bijgewerkt via een trigger.

- [ ] **Step 3: Verwijder de PostgREST poging en gebruik een simpelere benadering**

Voeg in plaats daarvan een extra query toe die order_ids met vrachten ophaalt:

```typescript
// Haal order_ids op die gekoppeld zijn aan vrachten
const { data: orderIdsMetVracht } = await supabase
  .from('vracht_regels')
  .select('levering:leveringen!inner(order_id)')

const vrachtOrderIds = [...new Set(
  (orderIdsMetVracht ?? []).map((vr: any) => vr.levering?.order_id).filter(Boolean)
)]

if (archief) {
  if (vrachtOrderIds.length === 0) {
    return { orders: [], totaal: 0 }
  }
  query = query.in('id', vrachtOrderIds)
} else {
  if (vrachtOrderIds.length > 0) {
    query = query.not('id', 'in', `(${vrachtOrderIds.join(',')})`)
  }
}
```

**Wacht** — dit schaalt niet goed bij veel orders. Betere benadering: een database view.

- [ ] **Step 3 (herzien): Maak een database view voor archief-status**

Maak een nieuw migratiebestand `supabase/migrations/029_order_archief_view.sql`:

```sql
-- View die per order aangeeft of er een vracht aan gekoppeld is
CREATE OR REPLACE VIEW order_heeft_vracht AS
SELECT DISTINCT o.id AS order_id
FROM orders o
JOIN leveringen l ON l.order_id = o.id
JOIN vracht_regels vr ON vr.levering_id = l.id;
```

- [ ] **Step 4: Pas getOrders aan met de view**

In `src/lib/db/orders.ts`, voeg het archief filter toe na de zoek-filter:

```typescript
if (archief) {
  // Alleen orders met een vracht — gebruik inner join via de view
  const { data: archiefIds } = await supabase.from('order_heeft_vracht').select('order_id')
  const ids = (archiefIds ?? []).map((r: any) => r.order_id)
  if (ids.length === 0) return { orders: [], totaal: 0 }
  query = query.in('id', ids)
} else {
  // Alleen orders zonder vracht
  const { data: archiefIds } = await supabase.from('order_heeft_vracht').select('order_id')
  const ids = (archiefIds ?? []).map((r: any) => r.order_id)
  if (ids.length > 0) {
    query = query.not('id', 'in', `(${ids.join(',')})`)
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/029_order_archief_view.sql src/lib/db/orders.ts
git commit -m "feat: add order archive filter using database view"
```

---

### Task 9: Actief/Archief tabs op orders-pagina

**Files:**
- Modify: `src/app/(app)/orders/page.tsx`

- [ ] **Step 1: Voeg archief parameter toe aan searchParams**

Pas de searchParams type aan:

```typescript
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; zoek?: string; archief?: string }>
}) {
  const params = await searchParams
  const pagina = parseInt(params.pagina ?? '1')
  const zoek = params.zoek ?? ''
  const archief = params.archief === '1'
  const perPagina = 50
  const { orders, totaal } = await getOrders(pagina, perPagina, zoek, archief)
  const totaalPaginas = Math.ceil(totaal / perPagina)
```

- [ ] **Step 2: Voeg de tabs toe in de JSX**

Voeg na de `<h1>` + buttons `<div>` en vóór de zoekresultaten-tekst de tabs toe:

```tsx
{/* Actief / Archief tabs */}
<div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
  <a
    href={`/orders${zoek ? `?zoek=${encodeURIComponent(zoek)}` : ''}`}
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      !archief ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    Actief
  </a>
  <a
    href={`/orders?archief=1${zoek ? `&zoek=${encodeURIComponent(zoek)}` : ''}`}
    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
      archief ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
    }`}
  >
    Archief
  </a>
</div>
```

- [ ] **Step 3: Pas de paginatie basisUrl aan**

Update de Pagination component om de archief parameter mee te nemen:

```tsx
<Pagination
  pagina={pagina}
  totaalPaginas={totaalPaginas}
  basisUrl={
    archief
      ? `/orders?archief=1${zoek ? `&zoek=${encodeURIComponent(zoek)}` : ''}`
      : zoek ? `/orders?zoek=${encodeURIComponent(zoek)}` : '/orders'
  }
/>
```

- [ ] **Step 4: Pas de lege-staat tekst aan**

```tsx
<td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
  {archief
    ? `Geen gearchiveerde orders gevonden${zoek ? ` voor "${zoek}"` : ''}.`
    : `Geen actieve orders gevonden${zoek ? ` voor "${zoek}"` : ''}.`
  }
</td>
```

- [ ] **Step 5: Test handmatig**

Run: `npm run dev`

1. Ga naar `/orders` — verwacht: alleen actieve orders (zonder gekoppelde vracht)
2. Klik op "Archief" — verwacht: alleen orders met een vracht
3. Zoek werkt in beide tabs

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/orders/page.tsx
git commit -m "feat: add Actief/Archief tabs to orders page"
```

---

### Task 10: Eindtest en opruimen

- [ ] **Step 1: Volledige flow test**

1. Ga naar `/orders/nieuw`
2. Typ artikelcode `170051` → selecteer "Rochefort 8 8x33 cl"
3. Controleer: code, omschrijving, pallet (186, chep), artikel (tray wit 245x125x38mm) zijn ingevuld
4. Vul klant, ordernummer, ordergrootte, locatie in
5. Sla op → order wordt aangemaakt met juiste data
6. Maak een levering + vracht voor deze order
7. Ga naar `/orders` → order is verdwenen uit actief
8. Klik "Archief" → order staat hier

- [ ] **Step 2: Commit alles**

Als er nog uncommitted changes zijn:

```bash
git add -A
git commit -m "feat: productdefinities lookup and order archive complete"
```
