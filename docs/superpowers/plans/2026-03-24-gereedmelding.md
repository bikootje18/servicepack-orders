# Gereedmelding + Snelvracht — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Levering" hernoemen naar "gereedmelding" in de UI, de losse factuurknop verwijderen, en een snelknop toevoegen die in één actie gereedmelding + vracht + factuur aanmaakt.

**Architecture:** Drie wijzigingen. (1) `db/leveringen.ts` geeft de aangemaakte levering terug zodat de snelactie het ID heeft. (2) Nieuwe server action `gereedmeldenEnVrachtAanmaken` hergebruikt bestaande `createVracht` en `dbCreateFactuur` en redirect naar `/vrachten/${id}/klaar`. (3) `LeveringForm` krijgt prop `klantId`, twee knoppen, en hernoemde labels; order detail pagina geeft `klantId` door en verwijdert de factuurknop.

**Tech Stack:** Next.js 15 App Router, Supabase, TypeScript, Tailwind CSS v4

---

## File Map

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/db/leveringen.ts` | `createLevering` geeft nu `Levering` terug i.p.v. `void` |
| `src/lib/actions/leveringen.ts` | Nieuwe action `gereedmeldenEnVrachtAanmaken` |
| `src/components/leveringen/LeveringForm.tsx` | Prop `klantId`, twee knoppen, labels hernoemd |
| `src/app/(app)/orders/[id]/page.tsx` | `klantId` aan LeveringForm, factuurknop weg, labels hernoemd |

---

## Taak 1: `createLevering` geeft Levering terug

**Files:**
- Modify: `src/lib/db/leveringen.ts`

**Context:** De huidige `createLevering` returnt `void`. De snelactie heeft het levering-ID nodig om de vracht aan te koppelen. Kleine signatuurwijziging — bestaande callers breken niet (ze negeren de return value al).

- [ ] **Stap 1: Update `createLevering` in `src/lib/db/leveringen.ts`**

Zoek:
```ts
export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  aangemaakt_door: string | null
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('leveringen').insert(data)
  if (error) throw error
}
```

Vervang met:
```ts
export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  aangemaakt_door: string | null
}): Promise<Levering> {
  const supabase = await createClient()
  const { data: levering, error } = await supabase
    .from('leveringen')
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return levering as Levering
}
```

- [ ] **Stap 2: TypeScript check**

```bash
cd "/Users/biko/Documents/New Order System" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
cd "/Users/biko/Documents/New Order System"
git add src/lib/db/leveringen.ts
git commit -m "fix: createLevering geeft Levering terug i.p.v. void"
```

---

## Taak 2: Server action `gereedmeldenEnVrachtAanmaken`

**Files:**
- Modify: `src/lib/actions/leveringen.ts`

**Context:** Huidige `src/lib/actions/leveringen.ts` heeft één action `createLevering`. De nieuwe action doet in volgorde: levering aanmaken → vracht aanmaken → factuur aanmaken → redirect naar klaar-pagina. Hergebruikt `createVracht` uit `db/vrachten.ts` en `createVrachtFactuur` uit `db/facturen.ts` (die al bestaan en ook door `createVrachtAction` worden gebruikt).

- [ ] **Stap 1: Vervang `src/lib/actions/leveringen.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createLevering as dbCreateLevering } from '@/lib/db/leveringen'
import { createVracht } from '@/lib/db/vrachten'
import { createVrachtFactuur as dbCreateFactuur } from '@/lib/db/facturen'

export async function createLevering(data: {
  order_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
  aangemaakt_door: string | null
}): Promise<void> {
  await dbCreateLevering(data)
  revalidatePath(`/orders/${data.order_id}`)
}

export async function gereedmeldenEnVrachtAanmaken(data: {
  order_id: string
  klant_id: string
  aantal_geleverd: number
  leverdatum: string
  notities: string
}): Promise<void> {
  // 1. Gereedmelding opslaan
  const levering = await dbCreateLevering({
    order_id: data.order_id,
    aantal_geleverd: data.aantal_geleverd,
    leverdatum: data.leverdatum,
    notities: data.notities,
    aangemaakt_door: null,
  })

  // 2. Vracht aanmaken met deze gereedmelding
  const vracht = await createVracht({
    klant_id: data.klant_id,
    datum: data.leverdatum,
    notities: '',
    levering_ids: [levering.id],
  })

  // 3. Factuur aanmaken
  await dbCreateFactuur(vracht.id)

  // 4. Naar klaar-pagina
  redirect(`/vrachten/${vracht.id}/klaar`)
}
```

- [ ] **Stap 2: TypeScript check**

```bash
cd "/Users/biko/Documents/New Order System" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 3: Commit**

```bash
cd "/Users/biko/Documents/New Order System"
git add src/lib/actions/leveringen.ts
git commit -m "feat: gereedmeldenEnVrachtAanmaken action — gereedmelding + vracht + factuur in één stap"
```

---

## Taak 3: LeveringForm — snelknop + labels

**Files:**
- Modify: `src/components/leveringen/LeveringForm.tsx`

**Context:** Client component. Krijgt nieuwe prop `klantId`. Twee submit-knoppen: de bestaande ("Gereedmelding opslaan") en de nieuwe snelknop ("Gereedmelden & Vracht aanmaken"). De snelknop leest dezelfde formuliervelden maar roept `gereedmeldenEnVrachtAanmaken` aan. Omdat die action `redirect()` doet, hoeft de client daarna niets te doen.

- [ ] **Stap 1: Vervang `src/components/leveringen/LeveringForm.tsx`**

```tsx
'use client'

import { useState, useRef } from 'react'
import { createLevering, gereedmeldenEnVrachtAanmaken } from '@/lib/actions/leveringen'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  klantId: string
  orderGrootte: number
  totaalGeleverd: number
}

export function LeveringForm({ orderId, klantId, orderGrootte, totaalGeleverd }: Props) {
  const router = useRouter()
  const resterend = orderGrootte - totaalGeleverd
  const [laden, setLaden] = useState(false)
  const [snelLaden, setSnelLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  if (resterend === 0) {
    return <p className="text-sm text-green-600 mb-4">Volledig gereedgemeld.</p>
  }

  function leesFormulier(): { aantal: number; leverdatum: string; notities: string } | null {
    const form = formRef.current
    if (!form) return null
    const formData = new FormData(form)
    const aantal = parseInt(formData.get('aantal_geleverd') as string)
    const leverdatum = formData.get('leverdatum') as string
    const notities = (formData.get('notities') as string) || ''
    return { aantal, leverdatum, notities }
  }

  async function handleOpslaan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const waarden = leesFormulier()
    if (!waarden) return
    const { aantal, leverdatum, notities } = waarden

    if (aantal > resterend) {
      setFout(`Maximaal ${resterend} eenheden resterend`)
      return
    }

    setLaden(true)
    setFout(null)
    await createLevering({
      order_id: orderId,
      aantal_geleverd: aantal,
      leverdatum,
      notities,
      aangemaakt_door: null,
    })
    router.refresh()
    setLaden(false)
    formRef.current?.reset()
  }

  async function handleSnelVracht(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    const waarden = leesFormulier()
    if (!waarden) return
    const { aantal, leverdatum, notities } = waarden

    if (!aantal || aantal <= 0) {
      setFout('Vul het aantal in')
      return
    }
    if (aantal > resterend) {
      setFout(`Maximaal ${resterend} eenheden resterend`)
      return
    }
    if (!leverdatum) {
      setFout('Vul de datum in')
      return
    }

    setSnelLaden(true)
    setFout(null)
    await gereedmeldenEnVrachtAanmaken({
      order_id: orderId,
      klant_id: klantId,
      aantal_geleverd: aantal,
      leverdatum,
      notities,
    })
    // redirect happens server-side, no cleanup needed
  }

  return (
    <form ref={formRef} onSubmit={handleOpslaan} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <p className="text-sm text-gray-500 mb-3">Resterend: <strong>{resterend.toLocaleString('nl-NL')}</strong> eenheden</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Aantal gereed *</label>
          <input name="aantal_geleverd" type="number" min="1" max={resterend} required
            className="form-input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Datum *</label>
          <input name="leverdatum" type="date" required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="form-input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notities</label>
          <input name="notities" className="form-input" />
        </div>
      </div>
      {fout && <p className="text-sm text-red-600 mt-2">{fout}</p>}
      <div className="flex gap-2 mt-3">
        <button type="submit" disabled={laden || snelLaden} className="btn-primary">
          {laden ? 'Opslaan...' : 'Gereedmelding opslaan'}
        </button>
        <button
          type="button"
          onClick={handleSnelVracht}
          disabled={laden || snelLaden}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {snelLaden ? 'Bezig...' : 'Gereedmelden & Vracht aanmaken'}
        </button>
      </div>
    </form>
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
git add src/components/leveringen/LeveringForm.tsx
git commit -m "feat: gereedmelding snelknop in LeveringForm, labels hernoemd"
```

---

## Taak 4: Order detail pagina — klantId doorgeven + factuurknop weg + labels

**Files:**
- Modify: `src/app/(app)/orders/[id]/page.tsx`

**Context:** Huidige pagina geeft `LeveringForm` geen `klantId`. Factuurknop onderin verwijderen. "Leveringen" heading hernoemen naar "Gereedmeldingen".

- [ ] **Stap 1: Lees `src/app/(app)/orders/[id]/page.tsx`**

- [ ] **Stap 2: Drie wijzigingen doorvoeren**

**A) `klantId` doorgeven aan `LeveringForm`:**

Zoek:
```tsx
<LeveringForm orderId={id} orderGrootte={order.order_grootte} totaalGeleverd={totaalGeleverd} />
```
Vervang met:
```tsx
<LeveringForm orderId={id} klantId={order.klant_id} orderGrootte={order.order_grootte} totaalGeleverd={totaalGeleverd} />
```

**B) "Leveringen" heading hernoemen:**

Zoek:
```tsx
<h2 className="text-lg font-semibold mb-3">Leveringen</h2>
```
Vervang met:
```tsx
<h2 className="text-lg font-semibold mb-3">Gereedmeldingen</h2>
```

**C) Factuurknop verwijderen:**

Zoek en verwijder het volledige blok:
```tsx
{ongefactureerdeLeveringen.length > 0 && order.status !== 'gefactureerd' && (
  <div className="mt-6">
    <Link href={`/facturen/nieuw?order_id=${id}`}
      className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700">
      Factuur aanmaken ({ongefactureerdeLeveringen.length} levering{ongefactureerdeLeveringen.length > 1 ? 'en' : ''})
    </Link>
  </div>
)}
```

Verwijder ook de variabele `ongefactureerdeLeveringen` (regel met `.filter(l => l.factuur_id === null)`) als die dan nergens meer gebruikt wordt.

- [ ] **Stap 3: TypeScript check**

```bash
cd "/Users/biko/Documents/New Order System" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Stap 4: Commit**

```bash
cd "/Users/biko/Documents/New Order System"
git add src/app/\(app\)/orders/\[id\]/page.tsx
git commit -m "feat: klantId aan LeveringForm, factuurknop verwijderd, Leveringen → Gereedmeldingen"
```

---

## Klaar

Controleer:
- Order detail → gereedmelding invullen → "Gereedmelding opslaan" → pagina herlaadt, melding zichtbaar ✓
- Order detail → gereedmelding invullen → "Gereedmelden & Vracht aanmaken" → direct naar klaar-pagina met vrachtbrief + factuur download ✓
- Geen "Factuur aanmaken" knop meer zichtbaar op order detail ✓
