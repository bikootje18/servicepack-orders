# Give-X Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importeer Give-X Excel bestanden, match ze aan bestaande orders op `order_code`, sla resultaten op in `give_x_imports`, en toon ongematchte imports op de klantpagina.

**Architecture:** Pure parser-functie (`give-x-parser.ts`) die rijen omzet naar een parse-resultaat — volledig testbaar zonder I/O. Server Action leest de bestanden, roept de parser aan, matcht op klant + order_code, en schrijft naar Supabase. Klant detailpagina toont de imports-sectie met een upload-formulier en een lijst van ongematchte imports.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), TypeScript, Tailwind, Vitest, `xlsx` (SheetJS) voor Excel parsing.

---

## File map

| Bestand | Actie | Verantwoordelijkheid |
|---------|-------|----------------------|
| `supabase/migrations/010_give_x_imports.sql` | Aanmaken | Tabel `give_x_imports` |
| `src/types/index.ts` | Aanpassen | Type `GiveXImport` toevoegen |
| `src/lib/utils/give-x-parser.ts` | Aanmaken | Pure parse-functie (rijen → resultaat) |
| `src/lib/utils/give-x-parser.test.ts` | Aanmaken | Vitest tests voor parser |
| `src/lib/db/klanten.ts` | Aanpassen | `getKlant(id)` toevoegen |
| `src/lib/db/give-x-imports.ts` | Aanmaken | DB queries voor `give_x_imports` |
| `src/lib/actions/give-x-imports.ts` | Aanmaken | Server Action: bestanden verwerken |
| `src/components/give-x/ImportDropzone.tsx` | Aanmaken | Client component: upload + resultaten |
| `src/app/(app)/klanten/page.tsx` | Aanpassen | Rijen klikbaar maken |
| `src/app/(app)/klanten/[id]/page.tsx` | Aanmaken | Klant detailpagina |
| `src/app/(app)/layout.tsx` | Aanpassen | Facturen uit navigatie verwijderen |
| `next.config.ts` | Aanpassen | Body size limit verhogen |

---

### Task 1: Database migratie

**Files:**
- Create: `supabase/migrations/010_give_x_imports.sql`

- [ ] **Stap 1: Schrijf de migratie**

```sql
-- supabase/migrations/010_give_x_imports.sql
create table give_x_imports (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references klanten(id),
  documentnummer text not null unique,
  instructie_code text not null,
  leverdatum date,
  totaal_hoeveelheid int not null,
  totaal_rollen int,
  heeft_rollen boolean not null default false,
  order_id uuid references orders(id),
  aangemaakt_op timestamptz not null default now()
);

create index give_x_imports_klant_id_idx on give_x_imports(klant_id);
create index give_x_imports_order_id_idx on give_x_imports(order_id);
```

- [ ] **Stap 2: Voer de migratie uit**

```bash
npx supabase db push
```

Expected: migratie succesvol, geen fouten.

- [ ] **Stap 3: Commit**

```bash
git add supabase/migrations/010_give_x_imports.sql
git commit -m "feat: migratie give_x_imports tabel"
```

---

### Task 2: TypeScript type toevoegen

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Stap 1: Voeg het type toe aan het einde van `src/types/index.ts`**

```typescript
export interface GiveXImport {
  id: string
  klant_id: string
  documentnummer: string
  instructie_code: string
  leverdatum: string | null
  totaal_hoeveelheid: number
  totaal_rollen: number | null
  heeft_rollen: boolean
  order_id: string | null
  aangemaakt_op: string
  // Joins
  order?: Pick<Order, 'id' | 'order_nummer' | 'order_code'>
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: GiveXImport type"
```

---

### Task 3: xlsx package installeren

**Files:**
- Modify: `package.json` (via npm)
- Modify: `next.config.ts`

- [ ] **Stap 1: Installeer xlsx**

```bash
npm install xlsx
```

Expected: `xlsx` verschijnt in `dependencies` in `package.json`.

- [ ] **Stap 2: Voeg body size limit toe aan `next.config.ts`**

Pas `next.config.ts` aan:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  turbopack: {
    resolveAlias: {
      '@react-pdf/renderer': {
        browser: '@react-pdf/renderer',
        default: './src/lib/pdf-stub.ts',
      },
    },
  },
};

export default nextConfig;
```

- [ ] **Stap 3: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "feat: xlsx package en verhoog server action body limit naar 50mb"
```

---

### Task 4: Parser (TDD)

**Files:**
- Create: `src/lib/utils/give-x-parser.ts`
- Create: `src/lib/utils/give-x-parser.test.ts`

De parser krijgt ruwe rijen (`string[][]`) en geeft een parse-resultaat terug. Geen I/O, volledig testbaar.

- [ ] **Stap 1: Schrijf de tests**

```typescript
// src/lib/utils/give-x-parser.test.ts
import { describe, it, expect } from 'vitest'
import { parseGiveXRows } from './give-x-parser'

const STANDAARD_HEADERS = [
  'Documentnummer', 'Artikelnummer', 'Klant artikelnummer',
  'Omschrijving op barcode', 'Barcode', 'Hoeveelheid',
  'Levering OCC', 'T.b.v. Order', 'Instructie', 'Geprod. SP',
]
const ROLLEN_HEADERS = [
  'Documentnummer', 'Artikelnummer', 'Omschrijving op barcode',
  'Barcode', 'Hoeveelheid', 'Rollen', 'Levering OCC',
  'T.b.v. Order', 'Instructie', 'Geprod. SP',
]

describe('parseGiveXRows', () => {
  it('parset een standaard bestand (zonder rollen)', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', '26-3-2026', 'order_55977_GBC', 'GIV00A-A', ''],
      ['20260326-GIV00A-A', '496011060', '', 'Omschrijving 2', '8718917669762', '30', '26-3-2026', 'order_55977_GBC', 'GIV00A-A', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '', '990', '', '', '', ''],
    ]
    const result = parseGiveXRows(rows, 'test.csv')
    expect(result.documentnummer).toBe('20260326-GIV00A-A')
    expect(result.instructie_code).toBe('GIV00AA')
    expect(result.totaal_hoeveelheid).toBe(990)
    expect(result.heeft_rollen).toBe(false)
    expect(result.totaal_rollen).toBeNull()
    expect(result.leverdatum).toEqual(new Date(2026, 2, 26))
  })

  it('parset een rollen-bestand', () => {
    const rows = [
      ROLLEN_HEADERS,
      ['20260326-GIV0RL-A', '318610059', 'Omschrijving', '8718917603703', '2000', '10', '26-3-2026', 'order_56106_Grand Ca', 'GIV0RL-A', ''],
      ['', '', '', '', '', '', '', '', '', ''],
      ['', '', '', '', '2000', '10', '', '', '', ''],
    ]
    const result = parseGiveXRows(rows, 'test.csv')
    expect(result.instructie_code).toBe('GIV0RLA')
    expect(result.totaal_hoeveelheid).toBe(2000)
    expect(result.heeft_rollen).toBe(true)
    expect(result.totaal_rollen).toBe(10)
  })

  it('verwijdert het streepje uit de instructiecode', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', '26-3-2026', 'order_55977_GBC', 'GIV00A-A', ''],
      ['', '', '', '', '', '60', '', '', '', ''],
    ]
    expect(parseGiveXRows(rows, 'test.csv').instructie_code).toBe('GIV00AA')
  })

  it('geeft null leverdatum bij onparseerbare datum', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', 'geen-datum', 'order_55977_GBC', 'GIV00A-A', ''],
      ['', '', '', '', '', '60', '', '', '', ''],
    ]
    expect(parseGiveXRows(rows, 'test.csv').leverdatum).toBeNull()
  })

  it('gooit een fout bij ontbrekende Instructie waarde', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', '26-3-2026', 'order_55977_GBC', '', ''],
      ['', '', '', '', '', '60', '', '', '', ''],
    ]
    expect(() => parseGiveXRows(rows, 'test.csv')).toThrow()
  })

  it('gooit een fout bij ontbrekende Hoeveelheid in somregel', () => {
    const rows = [
      STANDAARD_HEADERS,
      ['20260326-GIV00A-A', '496011059', '', 'Omschrijving', '8718917669761', '60', '26-3-2026', 'order_55977_GBC', 'GIV00A-A', ''],
      ['', '', '', '', '', '', '', '', '', ''],
    ]
    expect(() => parseGiveXRows(rows, 'test.csv')).toThrow()
  })

  it('gooit een fout bij onvoldoende rijen', () => {
    expect(() => parseGiveXRows([STANDAARD_HEADERS], 'test.csv')).toThrow()
  })
})
```

- [ ] **Stap 2: Draai de tests — verwacht FAIL**

```bash
npm run test -- give-x-parser --run
```

Expected: alle tests falen met "cannot find module".

- [ ] **Stap 3: Schrijf de implementatie**

```typescript
// src/lib/utils/give-x-parser.ts

export interface GiveXParseResult {
  documentnummer: string
  instructie_code: string
  leverdatum: Date | null
  totaal_hoeveelheid: number
  totaal_rollen: number | null
  heeft_rollen: boolean
}

function parseNLDate(s: string): Date | null {
  const match = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
}

export function parseGiveXRows(rows: string[][], bestandsnaam: string): GiveXParseResult {
  if (rows.length < 2) throw new Error(`${bestandsnaam}: onvoldoende rijen`)

  const headers = rows[0].map(h => h.trim())
  const heeft_rollen = headers.includes('Rollen')

  // Datarijen: Documentnummer is gevuld
  const dataRows = rows.slice(1).filter(row => row[0]?.trim())
  if (dataRows.length === 0) throw new Error(`${bestandsnaam}: geen datarijen gevonden`)

  const firstRow = dataRows[0]
  const documentnummer = firstRow[0].trim()

  const instructieIdx = headers.indexOf('Instructie')
  if (instructieIdx === -1) throw new Error(`${bestandsnaam}: Instructie kolom niet gevonden`)

  const instructieRaw = firstRow[instructieIdx]?.trim()
  if (!instructieRaw) throw new Error(`${bestandsnaam}: Instructie waarde ontbreekt`)

  const instructie_code = instructieRaw.replace('-', '')

  const leveringIdx = headers.indexOf('Levering OCC')
  const leveringRaw = leveringIdx >= 0 ? firstRow[leveringIdx]?.trim() ?? '' : ''
  const leverdatum = parseNLDate(leveringRaw)

  // Somrijen: Documentnummer is leeg maar rij heeft een gevulde cel
  const somRijen = rows.slice(1).filter(
    row => !row[0]?.trim() && row.some(cel => cel?.trim())
  )
  if (somRijen.length === 0) throw new Error(`${bestandsnaam}: somregel niet gevonden`)

  const somRij = somRijen[somRijen.length - 1]

  const hoeveelheidIdx = headers.indexOf('Hoeveelheid')
  if (hoeveelheidIdx === -1) throw new Error(`${bestandsnaam}: Hoeveelheid kolom niet gevonden`)

  const totaal_hoeveelheid = parseInt(somRij[hoeveelheidIdx]?.trim() ?? '')
  if (isNaN(totaal_hoeveelheid)) throw new Error(`${bestandsnaam}: ongeldige totaal hoeveelheid`)

  let totaal_rollen: number | null = null
  if (heeft_rollen) {
    const rollenIdx = headers.indexOf('Rollen')
    const rollenWaarde = somRij[rollenIdx]?.trim()
    totaal_rollen = rollenWaarde ? parseInt(rollenWaarde) : null
  }

  return { documentnummer, instructie_code, leverdatum, totaal_hoeveelheid, totaal_rollen, heeft_rollen }
}
```

- [ ] **Stap 4: Draai de tests — verwacht PASS**

```bash
npm run test -- give-x-parser --run
```

Expected: alle tests groen.

- [ ] **Stap 5: Commit**

```bash
git add src/lib/utils/give-x-parser.ts src/lib/utils/give-x-parser.test.ts
git commit -m "feat: Give-X parser met tests"
```

---

### Task 5: DB queries

**Files:**
- Create: `src/lib/db/give-x-imports.ts`
- Modify: `src/lib/db/klanten.ts` (voeg `getKlant` toe)

- [ ] **Stap 1: Voeg `getKlant` toe aan `src/lib/db/klanten.ts`**

Voeg deze functie toe na `getKlanten`:

```typescript
export async function getKlant(id: string): Promise<Klant> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('klanten')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}
```

- [ ] **Stap 2: Schrijf `src/lib/db/give-x-imports.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import type { GiveXImport } from '@/types'

export async function getGiveXImports(klantId: string): Promise<GiveXImport[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('give_x_imports')
    .select('*, order:orders(id, order_nummer, order_code)')
    .eq('klant_id', klantId)
    .order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data as GiveXImport[]
}

export async function saveGiveXImport(data: {
  klant_id: string
  documentnummer: string
  instructie_code: string
  leverdatum: string | null
  totaal_hoeveelheid: number
  totaal_rollen: number | null
  heeft_rollen: boolean
  order_id: string | null
}): Promise<GiveXImport> {
  const supabase = await createClient()
  const { data: record, error } = await supabase
    .from('give_x_imports')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return record as GiveXImport
}
```

- [ ] **Stap 3: Commit**

```bash
git add src/lib/db/give-x-imports.ts src/lib/db/klanten.ts
git commit -m "feat: give-x-imports DB queries en getKlant"
```

---

### Task 6: Server Action

**Files:**
- Create: `src/lib/actions/give-x-imports.ts`

De Server Action leest de bestanden uit FormData, parseert ze met de parser, matcht op order_code + klant_id, en slaat op in `give_x_imports`.

- [ ] **Stap 1: Schrijf de Server Action**

```typescript
'use server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { parseGiveXRows } from '@/lib/utils/give-x-parser'
import { saveGiveXImport } from '@/lib/db/give-x-imports'
import { revalidatePath } from 'next/cache'

export interface ImportResultaat {
  bestandsnaam: string
  status: 'gematcht' | 'niet_gevonden' | 'al_verwerkt' | 'fout'
  instructie_code?: string
  order_nummer?: string
  foutmelding?: string
}

async function bestandNaarRijen(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
}

async function vindOrder(klantId: string, instructieCode: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('id, order_nummer, order_code')
    .eq('klant_id', klantId)
    .eq('order_code', instructieCode)
    .order('aangemaakt_op', { ascending: false })
    .limit(1)
    .single()
  return data
}

export async function verwerkGiveXImports(
  klantId: string,
  formData: FormData
): Promise<ImportResultaat[]> {
  const bestanden = formData.getAll('bestanden') as File[]
  const resultaten: ImportResultaat[] = []

  for (const bestand of bestanden) {
    try {
      const rijen = await bestandNaarRijen(bestand)
      const parsed = parseGiveXRows(rijen, bestand.name)

      const order = await vindOrder(klantId, parsed.instructie_code)

      await saveGiveXImport({
        klant_id: klantId,
        documentnummer: parsed.documentnummer,
        instructie_code: parsed.instructie_code,
        leverdatum: parsed.leverdatum ? parsed.leverdatum.toISOString().split('T')[0] : null,
        totaal_hoeveelheid: parsed.totaal_hoeveelheid,
        totaal_rollen: parsed.totaal_rollen,
        heeft_rollen: parsed.heeft_rollen,
        order_id: order?.id ?? null,
      })

      resultaten.push({
        bestandsnaam: bestand.name,
        status: order ? 'gematcht' : 'niet_gevonden',
        instructie_code: parsed.instructie_code,
        order_nummer: order?.order_nummer,
      })
    } catch (err) {
      const fout = err as Error
      // Duplicate documentnummer → al verwerkt
      if (fout.message?.includes('duplicate') || fout.message?.includes('unique')) {
        resultaten.push({ bestandsnaam: bestand.name, status: 'al_verwerkt' })
      } else {
        resultaten.push({ bestandsnaam: bestand.name, status: 'fout', foutmelding: fout.message })
      }
    }
  }

  revalidatePath(`/klanten/${klantId}`)
  return resultaten
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/lib/actions/give-x-imports.ts
git commit -m "feat: Server Action voor Give-X import verwerking"
```

---

### Task 7: Navigatie opschonen

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/(app)/klanten/page.tsx`

- [ ] **Stap 1: Verwijder Facturen uit de nav in `src/app/(app)/layout.tsx`**

Verander de `nav` array (regel 5-11):

```typescript
const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/vrachten', label: 'Vrachten' },
  { href: '/voorraad', label: 'Voorraad' },
]
```

- [ ] **Stap 2: Maak klanten klikbaar in `src/app/(app)/klanten/page.tsx`**

Voeg de import toe bovenaan:

```typescript
import Link from 'next/link'
```

Vervang de `<tr>` in de tabel (huidig rond regel 63-71):

```tsx
{klanten.map(klant => (
  <tr key={klant.id} className="border-b border-gray-100 hover:bg-gray-50">
    <td className="py-2 font-medium">
      <Link href={`/klanten/${klant.id}`} className="hover:underline">
        {klant.naam}
      </Link>
    </td>
    <td className="py-2 text-gray-500 text-xs">
      {[klant.adres, klant.postcode && klant.stad ? `${klant.postcode} ${klant.stad}` : (klant.postcode || klant.stad), klant.land]
        .filter(Boolean).join(' · ')}
    </td>
  </tr>
))}
```

- [ ] **Stap 3: Controleer visueel in de browser**

Start de dev server: `npm run dev`

Verificeer:
- Facturen ontbreekt in de zijbalk
- Klikken op een klant navigeert naar `/klanten/[id]` (geeft 404 — dat komt in de volgende taak)

- [ ] **Stap 4: Commit**

```bash
git add src/app/(app)/layout.tsx src/app/(app)/klanten/page.tsx
git commit -m "feat: facturen uit nav, klanten klikbaar"
```

---

### Task 8: Klant detailpagina

**Files:**
- Create: `src/app/(app)/klanten/[id]/page.tsx`

- [ ] **Stap 1: Schrijf de klant detailpagina**

```tsx
// src/app/(app)/klanten/[id]/page.tsx
import { getKlant } from '@/lib/db/klanten'
import { getGiveXImports } from '@/lib/db/give-x-imports'
import { ImportDropzone } from '@/components/give-x/ImportDropzone'
import { notFound } from 'next/navigation'

const GIVE_X_NAAM = 'Give-X'

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klant = await getKlant(id).catch(() => null)
  if (!klant) notFound()

  const isGiveX = klant.naam.toLowerCase().includes('give-x') || klant.naam.toLowerCase().includes('givex')
  const imports = isGiveX ? await getGiveXImports(id) : []
  const ongematchteImports = imports.filter(i => !i.order_id)
  const gematchteImports = imports.filter(i => i.order_id)

  return (
    <div className="max-w-3xl">
      {/* Koptekst */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{klant.naam}</h1>
        {klant.adres && (
          <p className="text-sm text-gray-500 mt-1">
            {[klant.adres, klant.postcode && klant.stad ? `${klant.postcode} ${klant.stad}` : (klant.postcode || klant.stad), klant.land]
              .filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Give-X imports sectie */}
      {isGiveX && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Imports</h2>

          <ImportDropzone klantId={id} />

          {/* Ongematchte imports */}
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
                      <td className="py-2 text-gray-500 text-xs">
                        {imp.leverdatum ?? '—'}
                      </td>
                      <td className="py-2 text-right">{imp.totaal_hoeveelheid.toLocaleString('nl-NL')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Gematchte imports */}
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
                      <td className="py-2 text-gray-500 text-xs">
                        {imp.leverdatum ?? '—'}
                      </td>
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
```

- [ ] **Stap 2: Commit**

```bash
git add src/app/(app)/klanten/[id]/page.tsx
git commit -m "feat: klant detailpagina met Give-X imports sectie"
```

---

### Task 9: ImportDropzone component

**Files:**
- Create: `src/components/give-x/ImportDropzone.tsx`

- [ ] **Stap 1: Schrijf het component**

```tsx
// src/components/give-x/ImportDropzone.tsx
'use client'
import { useState, useRef } from 'react'
import { verwerkGiveXImports, ImportResultaat } from '@/lib/actions/give-x-imports'

export function ImportDropzone({ klantId }: { klantId: string }) {
  const [bezig, setBezig] = useState(false)
  const [resultaten, setResultaten] = useState<ImportResultaat[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const bestanden = formData.getAll('bestanden') as File[]
    if (bestanden.length === 0 || !bestanden[0].name) return

    setBezig(true)
    setResultaten(null)
    try {
      const res = await verwerkGiveXImports(klantId, formData)
      setResultaten(res)
    } finally {
      setBezig(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const gematchte = resultaten?.filter(r => r.status === 'gematcht').length ?? 0
  const nietGevonden = resultaten?.filter(r => r.status === 'niet_gevonden').length ?? 0
  const fouten = resultaten?.filter(r => r.status === 'fout' || r.status === 'al_verwerkt') ?? []

  return (
    <div>
      <form onSubmit={handleSubmit} className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          name="bestanden"
          multiple
          accept=".xlsx,.csv"
          className="hidden"
          id="give-x-upload"
        />
        <label
          htmlFor="give-x-upload"
          className="block cursor-pointer text-sm text-gray-500 mb-3 hover:text-gray-700"
        >
          Klik om bestanden te kiezen, of sleep ze hierheen
          <span className="block text-xs mt-1">.xlsx of .csv — meerdere bestanden tegelijk</span>
        </label>
        <button
          type="submit"
          disabled={bezig}
          className="btn-primary disabled:opacity-50"
        >
          {bezig ? 'Verwerken...' : 'Importeren'}
        </button>
      </form>

      {resultaten && (
        <div className="mt-4 text-sm space-y-2">
          {gematchte > 0 && (
            <p className="text-green-700">✓ {gematchte} order{gematchte !== 1 ? 's' : ''} gematcht</p>
          )}
          {nietGevonden > 0 && (
            <p className="text-amber-700">⚠ {nietGevonden} code{nietGevonden !== 1 ? 's' : ''} niet gevonden — staat onder "Nog te koppelen"</p>
          )}
          {fouten.map(r => (
            <p key={r.bestandsnaam} className="text-red-700">
              ✗ {r.bestandsnaam}: {r.status === 'al_verwerkt' ? 'al eerder verwerkt' : r.foutmelding}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Stap 2: Draai de dev server en test handmatig**

```bash
npm run dev
```

Verificeer:
- Navigeer naar een Give-X klant
- Upload één of meerdere bestanden
- Gematchte orders verschijnen in de "Verwerkt" tabel
- Ongematchte staan in "Nog te koppelen"
- Dubbele upload toont "al eerder verwerkt"

- [ ] **Stap 3: Draai alle tests**

```bash
npm run test:run
```

Expected: alle tests groen.

- [ ] **Stap 4: Commit**

```bash
git add src/components/give-x/ImportDropzone.tsx
git commit -m "feat: Give-X import dropzone component"
```

---

## Done

Na Task 9 is de feature compleet:
- Facturen verwijderd uit de nav
- Klanten zijn klikbaar
- Give-X klantpagina heeft een werkende import-dropzone
- Parser is volledig getest
- Gematchte en ongematchte imports zijn zichtbaar
