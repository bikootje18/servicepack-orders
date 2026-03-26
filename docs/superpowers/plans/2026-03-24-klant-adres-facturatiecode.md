# Klant Adres + Facturatie Code Vrij Typen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Klanten krijgen adresvelden (zichtbaar op de CMR vrachtbrief), en de facturatie code dropdown wordt vervangen door een vrij tekstveld met autocomplete.

**Architecture:** Twee onafhankelijke features. (1) DB-migratie voegt vier tekstkolommen toe aan `klanten`, types/DB-functies/UI worden bijgewerkt, VrachtbriefDocument toont het echte adres. (2) `<select>` voor facturatie code wordt `<input>` + `<datalist>`, een nieuwe `getCodeByCode()` functie doet de ID-lookup in de server action.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), TypeScript, Tailwind CSS v4, @react-pdf/renderer

---

## File Map

| Bestand | Wijziging |
|---------|-----------|
| `supabase/migrations/006_klant_adres.sql` | Nieuw — vier kolommen op klanten |
| `src/types/index.ts` | Klant type: adres/postcode/stad/land toevoegen |
| `src/lib/db/klanten.ts` | createKlant/updateKlant accepteren adres; buildKlantQuery updaten |
| `src/lib/db/codes.ts` | Nieuwe functie `getCodeByCode(code)` |
| `src/app/(app)/klanten/page.tsx` | Formulier met adresvelden, lijst toont adres |
| `src/components/vrachten/VrachtbriefDocument.tsx` | Props.klant uitbreiden, adres tonen in vak 2 + 3 |
| `src/app/(app)/orders/nieuw/page.tsx` | Select → datalist, server action gebruikt getCodeByCode |
| `src/app/(app)/orders/[id]/bewerken/page.tsx` | Idem |

---

## Taak 1: Database migratie — klant adres

**Files:**
- Create: `supabase/migrations/006_klant_adres.sql`

- [ ] **Stap 1: Maak het migratiebestand aan**

```sql
-- Voeg adresvelden toe aan klanten (allemaal leeg als default zodat bestaande klanten werken)
ALTER TABLE klanten
  ADD COLUMN adres text NOT NULL DEFAULT '',
  ADD COLUMN postcode text NOT NULL DEFAULT '',
  ADD COLUMN stad text NOT NULL DEFAULT '',
  ADD COLUMN land text NOT NULL DEFAULT '';
```

- [ ] **Stap 2: Voer de migratie uit op Supabase**

Ga naar het Supabase dashboard → SQL Editor, plak de SQL en voer uit.
Of via de CLI: `supabase db push` (als de CLI geconfigureerd is).

- [ ] **Stap 3: Commit het migratiebestand**

```bash
cd "/Users/biko/Documents/New Order System"
git add supabase/migrations/006_klant_adres.sql
git commit -m "feat: voeg adresvelden toe aan klanten tabel"
```

---

## Taak 2: Types + DB-functies — klant adres

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/db/klanten.ts`

- [ ] **Stap 1: Update `Klant` interface in `src/types/index.ts`**

Zoek:
```ts
export interface Klant {
  id: string
  naam: string
  aangemaakt_op: string
}
```

Vervang met:
```ts
export interface Klant {
  id: string
  naam: string
  adres: string
  postcode: string
  stad: string
  land: string
  aangemaakt_op: string
}
```

- [ ] **Stap 2: Update `src/lib/db/klanten.ts`**

Vervang het hele bestand:

```ts
import { createClient } from '@/lib/supabase/server'
import type { Klant } from '@/types'

interface KlantData {
  naam: string
  adres?: string
  postcode?: string
  stad?: string
  land?: string
}

export function validateKlant(data: { naam: string }): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.naam.trim()) errors.naam = 'Naam is verplicht'
  return errors
}

export function buildKlantQuery(data: KlantData) {
  return {
    naam: data.naam.trim(),
    adres: data.adres?.trim() ?? '',
    postcode: data.postcode?.trim() ?? '',
    stad: data.stad?.trim() ?? '',
    land: data.land?.trim() ?? '',
  }
}

export async function getKlanten(): Promise<Klant[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('klanten')
    .select('*')
    .order('naam')
  if (error) throw error
  return data
}

export async function createKlant(data: KlantData): Promise<Klant> {
  const supabase = await createClient()
  const { data: klant, error } = await supabase
    .from('klanten')
    .insert(buildKlantQuery(data))
    .select()
    .single()
  if (error) throw error
  return klant
}

export async function updateKlant(id: string, data: KlantData): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('klanten')
    .update(buildKlantQuery(data))
    .eq('id', id)
  if (error) throw error
}

export async function deleteKlant(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('klanten').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Stap 3: TypeScript check**

```bash
cd "/Users/biko/Documents/New Order System" && npx tsc --noEmit 2>&1 | head -20
```

Verwacht: geen nieuwe errors (mogelijk bestaande errors door `createKlant` signature-wijziging die in stap 4 worden opgelost).

- [ ] **Stap 4: Commit**

```bash
cd "/Users/biko/Documents/New Order System"
git add src/types/index.ts src/lib/db/klanten.ts
git commit -m "feat: klant type en DB-functies uitgebreid met adresvelden"
```

---

## Taak 3: Klantenpagina uitbreiden

**Files:**
- Modify: `src/app/(app)/klanten/page.tsx`

**Context:** De huidige klantenpagina heeft een compact formulier (naam + knop in één rij) en een simpele lijst met alleen de naam. Nu uitbreiden met adresvelden in het formulier en adres zichtbaar in de lijst.

- [ ] **Stap 1: Vervang `src/app/(app)/klanten/page.tsx`**

```tsx
import { getKlanten, createKlant } from '@/lib/db/klanten'
import { revalidatePath } from 'next/cache'

export default async function KlantenPage() {
  const klanten = await getKlanten()

  async function maakKlantAan(formData: FormData) {
    'use server'
    const naam = formData.get('naam') as string
    if (naam?.trim()) {
      await createKlant({
        naam,
        adres: formData.get('adres') as string,
        postcode: formData.get('postcode') as string,
        stad: formData.get('stad') as string,
        land: formData.get('land') as string,
      })
      revalidatePath('/klanten')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Klanten</h1>

      <form action={maakKlantAan} className="space-y-3 mb-8 bg-white border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Nieuwe klant</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
          <input name="naam" required className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
          <input name="adres" placeholder="Straat en huisnummer" className="form-input" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
            <input name="postcode" className="form-input" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Stad</label>
            <input name="stad" className="form-input" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Land</label>
          <input name="land" placeholder="bijv. Nederland" className="form-input" />
        </div>
        <button type="submit" className="btn-primary">
          Klant toevoegen
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Naam</th>
            <th className="text-left py-2 font-medium text-gray-600">Adres</th>
          </tr>
        </thead>
        <tbody>
          {klanten.map(klant => (
            <tr key={klant.id} className="border-b border-gray-100">
              <td className="py-2 font-medium">{klant.naam}</td>
              <td className="py-2 text-gray-500 text-xs">
                {[klant.adres, klant.postcode && klant.stad ? `${klant.postcode} ${klant.stad}` : (klant.postcode || klant.stad), klant.land]
                  .filter(Boolean).join(' · ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Stap 2: TypeScript check**

```bash
cd "/Users/biko/Documents/New Order System" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
cd "/Users/biko/Documents/New Order System"
git add src/app/\(app\)/klanten/page.tsx
git commit -m "feat: klantenpagina met adresvelden in formulier en lijst"
```

---

## Taak 4: Vrachtbrief PDF — adres tonen

**Files:**
- Modify: `src/components/vrachten/VrachtbriefDocument.tsx`

**Context:** De `Props` interface heeft `klant: { naam: string }`. Dit uitbreiden met adresvelden. Vak 2 (Ontvanger) toont nu het echte adres. Vak 3 (Afleverplaats) kan ook de stad + land van de klant tonen.

- [ ] **Stap 1: Update `Props` interface en vak 2 in `VrachtbriefDocument.tsx`**

Zoek de `Props` interface:
```ts
interface Props {
  vracht: Vracht & {
    klant: { naam: string }
    regels: VrachtRegel[]
  }
}
```

Vervang met:
```ts
interface Props {
  vracht: Vracht & {
    klant: { naam: string; adres: string; postcode: string; stad: string; land: string }
    regels: VrachtRegel[]
  }
}
```

Zoek vak 2 (Ontvanger):
```tsx
<View style={{ ...S.box, flex: 2 }}>
  <Text style={S.boxLabel}>2. Ontvanger (naam, adres, land)</Text>
  <Text style={S.boxValue}>{vracht.klant.naam}</Text>
  <Text style={{ fontSize: 8, color: '#aaa' }}>[Adres invullen]</Text>
</View>
```

Vervang met:
```tsx
<View style={{ ...S.box, flex: 2 }}>
  <Text style={S.boxLabel}>2. Ontvanger (naam, adres, land)</Text>
  <Text style={S.boxValue}>{vracht.klant.naam}</Text>
  {!!vracht.klant.adres && <Text style={S.boxValue}>{vracht.klant.adres}</Text>}
  {!!(vracht.klant.postcode || vracht.klant.stad) && (
    <Text style={S.boxValue}>
      {[vracht.klant.postcode, vracht.klant.stad].filter(Boolean).join(' ')}
    </Text>
  )}
  {!!vracht.klant.land && <Text style={S.boxValue}>{vracht.klant.land}</Text>}
</View>
```

Zoek vak 3 (Afleverplaats):
```tsx
<View style={{ ...S.box, flex: 2 }}>
  <Text style={S.boxLabel}>3. Afleverplaats (plaats, land)</Text>
  <Text style={{ fontSize: 8, color: '#aaa' }}>[Afleverplaats invullen]</Text>
</View>
```

Vervang met:
```tsx
<View style={{ ...S.box, flex: 2 }}>
  <Text style={S.boxLabel}>3. Afleverplaats (plaats, land)</Text>
  <Text style={S.boxValue}>
    {[vracht.klant.stad, vracht.klant.land].filter(Boolean).join(', ') || '–'}
  </Text>
</View>
```

- [ ] **Stap 2: Controleer of de klant-query in `getVracht` de adresvelden meestuurt**

Lees `src/lib/db/vrachten.ts` en check de select-query voor vrachten. Als `klant:klanten(id, naam)` staat, uitbreiden naar `klant:klanten(id, naam, adres, postcode, stad, land)`.

- [ ] **Stap 3: TypeScript check**

```bash
cd "/Users/biko/Documents/New Order System" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 4: Commit**

```bash
cd "/Users/biko/Documents/New Order System"
git add src/components/vrachten/VrachtbriefDocument.tsx src/lib/db/vrachten.ts
git commit -m "feat: klantadres op CMR vrachtbrief — vak 2 ontvanger en vak 3 afleverplaats"
```

---

## Taak 5: Facturatie code — lookup functie

**Files:**
- Modify: `src/lib/db/codes.ts`

**Context:** De server actions in orders/nieuw en orders/bewerken moeten de getypte code-tekst omzetten naar een `facturatie_code_id`. Dit doen we met een gerichte DB-query in plaats van alle codes in het geheugen te houden.

- [ ] **Stap 1: Voeg `getCodeByCode` toe aan `src/lib/db/codes.ts`**

Voeg onderaan het bestand toe:

```ts
export async function getCodeByCode(code: string): Promise<FacturatieCode | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('facturatie_codes')
    .select('*')
    .eq('code', code.trim())
    .eq('actief', true)
    .single()
  if (error) return null
  return data
}
```

- [ ] **Stap 2: TypeScript check**

```bash
cd "/Users/biko/Documents/New Order System" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
cd "/Users/biko/Documents/New Order System"
git add src/lib/db/codes.ts
git commit -m "feat: getCodeByCode lookup functie voor facturatie code tekst"
```

---

## Taak 6: Order formulieren — facturatie code vrij typen

**Files:**
- Modify: `src/app/(app)/orders/nieuw/page.tsx`
- Modify: `src/app/(app)/orders/[id]/bewerken/page.tsx`

**Context:** Beide formulieren hebben een `<select name="facturatie_code_id">`. Dit wordt een `<input type="text" list="codes-datalist">` + `<datalist>`. De server action leest de getypte code-tekst, zoekt de ID op via `getCodeByCode`, en gooit een fout als de code niet bestaat.

- [ ] **Stap 1: Update `src/app/(app)/orders/nieuw/page.tsx`**

Voeg `getCodeByCode` toe aan de import bovenaan:
```ts
import { getCodes, getCodeByCode } from '@/lib/db/codes'
```

Vervang in de server action `slaOrderOp`:
```ts
facturatie_code_id: formData.get('facturatie_code_id') as string,
```
met:
```ts
// Code lookup
const codeText = (formData.get('facturatie_code') as string ?? '').trim()
const gevondenCode = await getCodeByCode(codeText)
if (!gevondenCode) throw new Error(`Facturatie code '${codeText}' niet gevonden`)
```
en gebruik `gevondenCode.id` als `facturatie_code_id`:
```ts
facturatie_code_id: gevondenCode.id,
```

Vervang in de JSX het facturatie code veld:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code *</label>
  <select name="facturatie_code_id" required defaultValue={v?.facturatie_code_id}
    className="form-select">
    <option value="">Selecteer code...</option>
    {codes.map(c => <option key={c.id} value={c.id}>{c.code} – {c.omschrijving}</option>)}
  </select>
</div>
```
met:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code *</label>
  <input
    name="facturatie_code"
    list="codes-datalist"
    required
    defaultValue={v?.facturatie_code?.code ?? ''}
    placeholder="Type code..."
    className="form-input"
    autoComplete="off"
  />
  <datalist id="codes-datalist">
    {codes.map(c => (
      <option key={c.id} value={c.code}>{c.omschrijving}</option>
    ))}
  </datalist>
</div>
```

- [ ] **Stap 2: Update `src/app/(app)/orders/[id]/bewerken/page.tsx`**

Dezelfde aanpassingen als stap 1:

Voeg `getCodeByCode` toe aan de import:
```ts
import { getCodes, getCodeByCode } from '@/lib/db/codes'
```

In de server action `slaOpgeslagenOp`, vervang:
```ts
facturatie_code_id: formData.get('facturatie_code_id') as string,
```
met:
```ts
const codeText = (formData.get('facturatie_code') as string ?? '').trim()
const gevondenCode = await getCodeByCode(codeText)
if (!gevondenCode) throw new Error(`Facturatie code '${codeText}' niet gevonden`)
```
en gebruik:
```ts
facturatie_code_id: gevondenCode.id,
```

Vervang in de JSX:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code *</label>
  <select name="facturatie_code_id" required defaultValue={order.facturatie_code_id}
    className="form-select">
    {codes.map(c => <option key={c.id} value={c.id}>{c.code} – {c.omschrijving}</option>)}
  </select>
</div>
```
met:
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code *</label>
  <input
    name="facturatie_code"
    list="codes-datalist-bewerken"
    required
    defaultValue={order.facturatie_code?.code ?? ''}
    placeholder="Type code..."
    className="form-input"
    autoComplete="off"
  />
  <datalist id="codes-datalist-bewerken">
    {codes.map(c => (
      <option key={c.id} value={c.code}>{c.omschrijving}</option>
    ))}
  </datalist>
</div>
```

- [ ] **Stap 3: TypeScript check**

```bash
cd "/Users/biko/Documents/New Order System" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 4: Commit**

```bash
cd "/Users/biko/Documents/New Order System"
git add src/app/\(app\)/orders/nieuw/page.tsx src/app/\(app\)/orders/\[id\]/bewerken/page.tsx
git commit -m "feat: facturatie code vrij typen met autocomplete op order formulieren"
```

---

## Klaar

Controleer na alle taken:
- Nieuwe klant aanmaken inclusief adres → adres zichtbaar in lijst ✓
- Vracht aanmaken → vrachtbrief PDF downloaden → adres zichtbaar in vak 2 en vak 3 ✓
- Nieuwe order → facturatie code typen → autocomplete toont suggesties → opslaan werkt ✓
- Order bewerken → bestaande code verschijnt vooringevuld in het tekstveld ✓
