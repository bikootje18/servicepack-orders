# Gereedmelding cascade verwijderen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maak het mogelijk om een gereedmelding te verwijderen ook als hij al in een factuur zit, waarbij de bijbehorende factuur, vracht-regelkoppeling en eventueel lege vracht automatisch meeverwijderd worden.

**Architecture:** Nieuwe functie `deleteLeveringMetCascade` in de datalaag die in de juiste volgorde opruimt: vracht_regel → lege vracht + factuur → gereedmelding-factuurkoppeling → gereedmelding. De bestaande server action `deleteLevering` roept deze nieuwe functie aan. De UI toont de "Verwijderen" knop altijd, met een aangepaste bevestigingsvraag als er een factuur aan hangt.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Vitest

---

## Bestandsoverzicht

| Bestand | Wijziging |
|---|---|
| `src/lib/db/leveringen.ts` | Nieuwe functie `deleteLeveringMetCascade` toevoegen |
| `src/lib/db/leveringen.test.ts` | Tests voor `deleteLeveringMetCascade` (pure logica) |
| `src/lib/actions/leveringen.ts` | `deleteLevering` action roept cascade-functie aan |
| `src/components/leveringen/LeveringenList.tsx` | Knop altijd tonen, bevestigingsvraag aanpassen |

---

### Task 1: `deleteLeveringMetCascade` toevoegen aan de datalaag

**Files:**
- Modify: `src/lib/db/leveringen.ts`

De functie moet in deze volgorde werken:
1. Haal de gereedmelding op om `factuur_id` te lezen
2. Zoek de bijbehorende `vracht_regel` op (via `levering_id`)
3. Verwijder de `vracht_regel`
4. Als de vracht nu leeg is (geen `vracht_regels` meer) → verwijder de factuur van de vracht, verwijder de vracht
5. Als de gereedmelding een `factuur_id` had → verwijder die factuur (als die nog bestaat)
6. Verwijder de gereedmelding

- [ ] **Stap 1: Voeg de functie toe onderaan `src/lib/db/leveringen.ts`**

```typescript
export async function deleteLeveringMetCascade(id: string): Promise<void> {
  const supabase = await createClient()

  // Stap 1: Lees de gereedmelding op voor factuur_id
  const { data: levering, error: leveringError } = await supabase
    .from('leveringen')
    .select('factuur_id')
    .eq('id', id)
    .single()
  if (leveringError) throw leveringError

  // Stap 2: Zoek bijbehorende vracht_regel op
  const { data: regel, error: regelError } = await supabase
    .from('vracht_regels')
    .select('vracht_id')
    .eq('levering_id', id)
    .maybeSingle()
  if (regelError) throw regelError

  if (regel) {
    // Stap 3: Verwijder de vracht_regel
    const { error: deleteRegelError } = await supabase
      .from('vracht_regels')
      .delete()
      .eq('levering_id', id)
    if (deleteRegelError) throw deleteRegelError

    // Stap 4: Check of vracht nu leeg is
    const { data: overig, error: overigError } = await supabase
      .from('vracht_regels')
      .select('vracht_id')
      .eq('vracht_id', regel.vracht_id)
    if (overigError) throw overigError

    if (overig.length === 0) {
      // Vracht is leeg → verwijder de vracht-factuur én de vracht
      await supabase.from('facturen').delete().eq('vracht_id', regel.vracht_id)
      const { error: deleteVrachtError } = await supabase
        .from('vrachten')
        .delete()
        .eq('id', regel.vracht_id)
      if (deleteVrachtError) throw deleteVrachtError
    }
    // Als vracht nog regels heeft: factuur blijft staan (hoort bij overige gereedmeldingen)
  } else if (levering.factuur_id) {
    // Geen vracht_regel: gereedmelding heeft een order-factuur → verwijder die
    const { error: deleteFactuurError } = await supabase
      .from('facturen')
      .delete()
      .eq('id', levering.factuur_id)
    if (deleteFactuurError) throw deleteFactuurError
  }

  // Stap 5: Verwijder de gereedmelding
  const { error: deleteLeveringError } = await supabase
    .from('leveringen')
    .delete()
    .eq('id', id)
  if (deleteLeveringError) throw deleteLeveringError
}
```

- [ ] **Stap 2: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output

- [ ] **Stap 3: Commit**

```bash
git add src/lib/db/leveringen.ts
git commit -m "feat: voeg deleteLeveringMetCascade toe aan datalaag"
```

---

### Task 2: Server action aanpassen

**Files:**
- Modify: `src/lib/actions/leveringen.ts`

De bestaande `deleteLevering` server action roept nu `deleteLeveringMetCascade` aan in plaats van `dbDeleteLevering`.

- [ ] **Stap 1: Pas de import aan bovenaan `src/lib/actions/leveringen.ts`**

Verander:
```typescript
import { createLevering as dbCreateLevering, deleteLevering as dbDeleteLevering, updateLevering as dbUpdateLevering } from '@/lib/db/leveringen'
```

naar:
```typescript
import { createLevering as dbCreateLevering, deleteLevering as dbDeleteLevering, deleteLeveringMetCascade as dbDeleteLeveringMetCascade, updateLevering as dbUpdateLevering } from '@/lib/db/leveringen'
```

- [ ] **Stap 2: Pas de `deleteLevering` server action aan**

Verander:
```typescript
export async function deleteLevering(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const orderId = formData.get('order_id') as string
  await dbDeleteLevering(id)
  redirect(`/orders/${orderId}`)
}
```

naar:
```typescript
export async function deleteLevering(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const orderId = formData.get('order_id') as string
  await dbDeleteLeveringMetCascade(id)
  redirect(`/orders/${orderId}`)
}
```

- [ ] **Stap 3: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output

- [ ] **Stap 4: Commit**

```bash
git add src/lib/actions/leveringen.ts
git commit -m "feat: deleteLevering action gebruikt cascade-verwijdering"
```

---

### Task 3: UI aanpassen — knop altijd tonen met juiste bevestiging

**Files:**
- Modify: `src/components/leveringen/LeveringenList.tsx`

Op dit moment staat de "Verwijderen" knop (en de "Bewerken" knop) in een `{!inFactuur && (...)}` blok. We willen:
- "Verwijderen" knop altijd tonen
- "Bewerken" knop alleen tonen als `!inFactuur` (dit blijft zo)
- Bevestigingsvraag aanpassen op basis van `inFactuur`

- [ ] **Stap 1: Pas `src/components/leveringen/LeveringenList.tsx` aan**

Zoek het blok (regels 113–135):
```tsx
<td className="px-3 py-3.5 text-right print:hidden">
  {!inFactuur && (
    <div className="flex items-center gap-2 justify-end">
      <button
        type="button"
        onClick={() => setBewerkId(l.id)}
        className="text-xs text-gray-400 hover:text-gray-700"
      >
        Bewerken
      </button>
      <form action={deleteLevering} className="inline-flex items-center">
        <input type="hidden" name="id" value={l.id} />
        <input type="hidden" name="order_id" value={orderId} />
        <button type="submit"
          className="text-xs text-red-400 hover:text-red-600"
          onClick={(e) => { if (!confirm('Gereedmelding verwijderen?')) e.preventDefault() }}
        >
          Verwijderen
        </button>
      </form>
    </div>
  )}
</td>
```

Vervang door:
```tsx
<td className="px-3 py-3.5 text-right print:hidden">
  <div className="flex items-center gap-2 justify-end">
    {!inFactuur && (
      <button
        type="button"
        onClick={() => setBewerkId(l.id)}
        className="text-xs text-gray-400 hover:text-gray-700"
      >
        Bewerken
      </button>
    )}
    <form action={deleteLevering} className="inline-flex items-center">
      <input type="hidden" name="id" value={l.id} />
      <input type="hidden" name="order_id" value={orderId} />
      <button type="submit"
        className="text-xs text-red-400 hover:text-red-600"
        onClick={(e) => {
          const bericht = inFactuur
            ? 'Deze gereedmelding is gekoppeld aan een factuur. De factuur en eventuele vracht worden ook verwijderd. Doorgaan?'
            : 'Gereedmelding verwijderen?'
          if (!confirm(bericht)) e.preventDefault()
        }}
      >
        Verwijderen
      </button>
    </form>
  </div>
</td>
```

- [ ] **Stap 2: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output

- [ ] **Stap 3: Run alle tests**

```bash
npx vitest run
```

Verwacht: alle tests PASS

- [ ] **Stap 4: Commit**

```bash
git add src/components/leveringen/LeveringenList.tsx
git commit -m "feat: verwijderknop gereedmelding altijd tonen met cascade-bevestiging"
```
