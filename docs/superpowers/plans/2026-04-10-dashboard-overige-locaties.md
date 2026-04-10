# Dashboard: Overige locaties + deadline-drempel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een vierde kolom "Overige locaties" toe aan het dashboard voor orders op externe locaties, en vergroot de deadline-drempel van 1 naar 2 dagen.

**Architecture:** De datalaag krijgt een nieuwe functie `getOrdersOverigeLocaties()` die orders van de vijf externe locaties samenvoegt. De `deadlineKleur` drempel wordt aangepast van `<= 1` naar `<= 2`. De dashboardpagina roept de nieuwe functie aan en rendert de vierde `LocatieKolom`. De bestaande `LocatieKolom` component hoeft niet aangepast te worden.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase, Vitest

---

### Task 1: deadline-drempel aanpassen van 1 naar 2 dagen

**Files:**
- Modify: `src/lib/db/dashboard.ts:13`
- Modify: `src/lib/db/dashboard.test.ts`

- [ ] **Stap 1: Update de bestaande test voor "overmorgen" en voeg een nieuwe test toe**

Open `src/lib/db/dashboard.test.ts` en vervang de volledige inhoud door:

```typescript
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
  it('returns "oranje" for the day after tomorrow', () => {
    const overmorgen = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
    expect(deadlineKleur(overmorgen)).toBe('oranje')
  })
  it('returns null for 3 days from now', () => {
    const drieDagen = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
    expect(deadlineKleur(drieDagen)).toBeNull()
  })
  it('returns null for a far-future deadline', () => {
    expect(deadlineKleur('2099-12-31')).toBeNull()
  })
  it('returns null for null deadline', () => {
    expect(deadlineKleur(null)).toBeNull()
  })
})
```

- [ ] **Stap 2: Run tests — verwacht 2 failures**

```bash
npx vitest run src/lib/db/dashboard.test.ts
```

Verwacht: 2 tests FAIL:
- `returns "oranje" for the day after tomorrow` → ontvangt `null`
- `returns null for 3 days from now` → (kan slagen, afhankelijk van huidige drempel)

- [ ] **Stap 3: Pas de drempel aan in dashboard.ts**

In `src/lib/db/dashboard.ts`, regel 14, verander:

```typescript
  if (dagVerschil <= 1) return 'oranje'
```

naar:

```typescript
  if (dagVerschil <= 2) return 'oranje'
```

- [ ] **Stap 4: Run tests — verwacht alle groen**

```bash
npx vitest run src/lib/db/dashboard.test.ts
```

Verwacht: alle 7 tests PASS

- [ ] **Stap 5: Commit**

```bash
git add src/lib/db/dashboard.ts src/lib/db/dashboard.test.ts
git commit -m "feat: vergroot deadline-drempel naar 2 dagen voor oranje markering"
```

---

### Task 2: getOrdersOverigeLocaties() toevoegen aan datalaag

**Files:**
- Modify: `src/lib/db/dashboard.ts`

- [ ] **Stap 1: Bekijk de bestaande `getOrdersPerLocatie` functie**

Open `src/lib/db/dashboard.ts` en lees de volledige functie. De nieuwe functie volgt hetzelfde patroon maar filtert op locaties met `dashboard: false`.

- [ ] **Stap 2: Voeg de nieuwe functie toe onderaan `dashboard.ts`**

Voeg toe na de bestaande `getVrachtenPerLocatie` functie:

```typescript
export async function getOrdersOverigeLocaties(): Promise<{ inBehandeling: Order[]; bevestigd: Order[] }> {
  const supabase = await createClient()
  const overigeLocaties = LOCATIES.filter(l => !l.dashboard).map(l => l.waarde)

  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .in('status', ['in_behandeling', 'bevestigd'])
    .in('locatie', overigeLocaties)
    .order('deadline', { ascending: true, nullsFirst: false })
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

- [ ] **Stap 3: Controleer TypeScript — geen fouten verwacht**

```bash
npx tsc --noEmit
```

Verwacht: geen output (geen fouten)

- [ ] **Stap 4: Commit**

```bash
git add src/lib/db/dashboard.ts
git commit -m "feat: voeg getOrdersOverigeLocaties() toe aan dashboard datalaag"
```

---

### Task 3: Vierde kolom renderen op de dashboardpagina

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Stap 1: Bekijk de huidige dashboardpagina**

Open `src/app/(app)/dashboard/page.tsx`. De pagina roept `getOrdersPerLocatie()` en `getVrachtenPerLocatie()` aan en rendert drie `LocatieKolom` componenten in een `grid-cols-3`.

- [ ] **Stap 2: Pas de dashboardpagina aan**

Vervang de volledige inhoud van `src/app/(app)/dashboard/page.tsx` door:

```typescript
import { getOrdersPerLocatie, getVrachtenPerLocatie, getOrdersOverigeLocaties } from '@/lib/db/dashboard'
import { DASHBOARD_LOCATIES } from '@/lib/constants/locaties'
import { LocatieKolom } from '@/components/dashboard/LocatieKolom'

const KLEUREN = ['#2563eb', '#059669', '#7c3aed', '#6b7280'] as const

export default async function DashboardPage() {
  const [orders, vrachten, overigeOrders] = await Promise.all([
    getOrdersPerLocatie(),
    getVrachtenPerLocatie(),
    getOrdersOverigeLocaties(),
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

      <div className="grid grid-cols-4 gap-5 items-start">
        {DASHBOARD_LOCATIES.map((l, i) => (
          <LocatieKolom
            key={l.waarde}
            label={l.label}
            kleur={KLEUREN[i]}
            inBehandeling={orders[l.waarde].inBehandeling}
            bevestigd={orders[l.waarde].bevestigd}
            vrachten={vrachten[l.waarde]}
          />
        ))}
        <LocatieKolom
          label="Overige locaties"
          kleur={KLEUREN[3]}
          inBehandeling={overigeOrders.inBehandeling}
          bevestigd={overigeOrders.bevestigd}
          vrachten={[]}
        />
      </div>
    </div>
  )
}
```

- [ ] **Stap 3: Controleer TypeScript**

```bash
npx tsc --noEmit
```

Verwacht: geen output

- [ ] **Stap 4: Controleer visueel in de browser**

```bash
npm run dev
```

Open `http://localhost:3000/dashboard`. Verwacht:
- Vier kolommen zichtbaar, even breed
- Eerste drie kolommen ongewijzigd (blauw, groen, paars)
- Vierde kolom grijs, label "Overige locaties"
- Orders op externe locaties (Darero, WVS, Rotterdam, Sittard, Gilze) zichtbaar in de vierde kolom
- Orders met deadline over ≤ 2 dagen krijgen oranje markering

- [ ] **Stap 5: Run alle tests**

```bash
npx vitest run
```

Verwacht: alle tests PASS

- [ ] **Stap 6: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: voeg vierde kolom 'Overige locaties' toe aan dashboard"
```
