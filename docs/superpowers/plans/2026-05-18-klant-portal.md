# Klant Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only customer portal where klanten can log in with email + password and see their own orders and leveringen, without access to internal fields or other customers' data.

**Architecture:** New `(portal)` route group alongside existing `(app)` and `(auth)`. Customers are Supabase auth users with `user_metadata.role = 'klant'`. Middleware routes them exclusively to `/portal/*`. RLS policies enforce data isolation at the database level.

**Tech Stack:** Next.js 15 App Router, Supabase (auth + RLS), TypeScript, Vitest, Tailwind CSS

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `supabase/migrations/030_klant_portal.sql` | Create | DB column + updated RLS policies |
| `src/types/index.ts` | Modify | Add `portal_user_id` to `Klant`, add `PortalOrder` + `PortalLevering` |
| `src/lib/utils/portal-status.ts` | Create | Pure status label/color helpers |
| `src/lib/utils/portal-status.test.ts` | Create | Tests for status helpers |
| `src/lib/db/portal.ts` | Create | Portal-specific DB queries |
| `src/lib/actions/portal.ts` | Create | Invite, revoke, and logout server actions |
| `src/middleware.ts` | Modify | Handle `/portal/*` routing |
| `src/app/(portal)/layout.tsx` | Create | Minimal portal shell |
| `src/app/(portal)/login/page.tsx` | Create | Customer login page |
| `src/components/portal/PortalOrderLijst.tsx` | Create | Expandable order list |
| `src/app/(portal)/dashboard/page.tsx` | Create | Customer order overview |
| `src/components/portal/PortalToegang.tsx` | Create | Invite/revoke UI |
| `src/app/(app)/klanten/[id]/page.tsx` | Modify | Add portal section |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/030_klant_portal.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/030_klant_portal.sql`:

```sql
-- Add portal_user_id to klanten
ALTER TABLE klanten
ADD COLUMN portal_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Klanten: restrict portal users to their own record only
DROP POLICY "Authenticated users can do everything on klanten" ON klanten;

CREATE POLICY "Staff heeft volledige toegang tot klanten"
  ON klanten FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

CREATE POLICY "Klant ziet eigen klantrecord"
  ON klanten FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'klant'
    AND portal_user_id = auth.uid()
  );

-- Orders: restrict portal users to their own orders, read-only
DROP POLICY "Authenticated users can do everything on orders" ON orders;

CREATE POLICY "Staff heeft volledige toegang tot orders"
  ON orders FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

CREATE POLICY "Klant ziet eigen orders"
  ON orders FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'klant'
    AND klant_id = (SELECT id FROM klanten WHERE portal_user_id = auth.uid())
  );

-- Leveringen: restrict portal users to leveringen of their own orders, read-only
DROP POLICY "Authenticated users can do everything on leveringen" ON leveringen;

CREATE POLICY "Staff heeft volledige toegang tot leveringen"
  ON leveringen FOR ALL TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IS DISTINCT FROM 'klant');

CREATE POLICY "Klant ziet eigen leveringen"
  ON leveringen FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'klant'
    AND order_id IN (
      SELECT id FROM orders
      WHERE klant_id = (SELECT id FROM klanten WHERE portal_user_id = auth.uid())
    )
  );
```

- [ ] **Step 2: Apply migration to Supabase**

```bash
npx supabase db push
```

Expected: migration applied without errors. If using Supabase Studio, run the SQL directly in the SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/030_klant_portal.sql
git commit -m "feat: add klant portal DB migration"
```

---

## Task 2: Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `portal_user_id` to `Klant` and add portal types**

In `src/types/index.ts`, update the `Klant` interface and add two new interfaces at the end of the file:

Add `portal_user_id: string | null` to the `Klant` interface (after `email`):

```typescript
export interface Klant {
  id: string
  naam: string
  adres: string
  postcode: string
  stad: string
  land: string
  email: string | null
  portal_user_id: string | null
  aangemaakt_op: string
}
```

Add at the end of `src/types/index.ts`:

```typescript
export interface PortalLevering {
  id: string
  leverdatum: string
  aantal_geleverd: number
  notities: string
}

export interface PortalOrder {
  id: string
  order_nummer: string
  order_code: string
  status: OrderStatus
  order_grootte: number
  deadline: string | null
  tht: string | null
  pallet_type: PalletType
  aantal_per_doos: number
  aantal_per_inner: number
  aantal_per_pallet: number
  leveringen: PortalLevering[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add portal types to Klant and add PortalOrder/PortalLevering"
```

---

## Task 3: Status Utility (TDD)

**Files:**
- Create: `src/lib/utils/portal-status.ts`
- Create: `src/lib/utils/portal-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/portal-status.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { statusLabel, statusKleurKlasse } from './portal-status'

describe('statusLabel', () => {
  it('returns Dutch label for each status', () => {
    expect(statusLabel('concept')).toBe('Concept')
    expect(statusLabel('bevestigd')).toBe('Bevestigd')
    expect(statusLabel('in_behandeling')).toBe('In behandeling')
    expect(statusLabel('geleverd')).toBe('Geleverd')
    expect(statusLabel('gefactureerd')).toBe('Gefactureerd')
  })
})

describe('statusKleurKlasse', () => {
  it('returns a non-empty string for each status', () => {
    const statuses = ['concept', 'bevestigd', 'in_behandeling', 'geleverd', 'gefactureerd'] as const
    for (const s of statuses) {
      expect(statusKleurKlasse(s).length).toBeGreaterThan(0)
    }
  })

  it('returns distinct classes for different statuses', () => {
    expect(statusKleurKlasse('concept')).not.toBe(statusKleurKlasse('geleverd'))
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run src/lib/utils/portal-status.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/portal-status.ts`:

```typescript
import type { OrderStatus } from '@/types'

const LABELS: Record<OrderStatus, string> = {
  concept: 'Concept',
  bevestigd: 'Bevestigd',
  in_behandeling: 'In behandeling',
  geleverd: 'Geleverd',
  gefactureerd: 'Gefactureerd',
}

const KLEUREN: Record<OrderStatus, string> = {
  concept: 'bg-gray-100 text-gray-600',
  bevestigd: 'bg-blue-50 text-blue-700',
  in_behandeling: 'bg-amber-50 text-amber-700',
  geleverd: 'bg-green-50 text-green-700',
  gefactureerd: 'bg-purple-50 text-purple-700',
}

export function statusLabel(status: OrderStatus): string {
  return LABELS[status]
}

export function statusKleurKlasse(status: OrderStatus): string {
  return KLEUREN[status]
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx vitest run src/lib/utils/portal-status.test.ts
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/portal-status.ts src/lib/utils/portal-status.test.ts
git commit -m "feat: add portal status label and color utilities"
```

---

## Task 4: Portal DB Queries

**Files:**
- Create: `src/lib/db/portal.ts`

- [ ] **Step 1: Create the portal DB module**

Create `src/lib/db/portal.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import type { PortalOrder } from '@/types'

export async function getPortalOrders(klantId: string): Promise<PortalOrder[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_nummer,
      order_code,
      status,
      order_grootte,
      deadline,
      tht,
      pallet_type,
      aantal_per_doos,
      aantal_per_inner,
      aantal_per_pallet,
      leveringen (
        id,
        leverdatum,
        aantal_geleverd,
        notities
      )
    `)
    .eq('klant_id', klantId)
    .order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data as PortalOrder[]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/portal.ts
git commit -m "feat: add portal DB query for customer orders"
```

---

## Task 5: Portal Server Actions

**Files:**
- Create: `src/lib/actions/portal.ts`

- [ ] **Step 1: Create portal server actions**

Create `src/lib/actions/portal.ts`:

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function uitnodigingVersturen(klantId: string, email: string): Promise<void> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { role: 'klant' },
  })
  if (error) throw new Error(error.message)

  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('klanten')
    .update({ portal_user_id: data.user.id })
    .eq('id', klantId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath(`/klanten/${klantId}`)
}

export async function toegangIntrekken(klantId: string, portalUserId: string): Promise<void> {
  const admin = createAdminClient()
  const { error: deleteError } = await admin.auth.admin.deleteUser(portalUserId)
  if (deleteError) throw new Error(deleteError.message)

  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from('klanten')
    .update({ portal_user_id: null })
    .eq('id', klantId)
  if (updateError) throw new Error(updateError.message)

  revalidatePath(`/klanten/${klantId}`)
}

export async function portalUitloggen(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/portal/login')
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/portal.ts
git commit -m "feat: add portal server actions for invite, revoke, and logout"
```

---

## Task 6: Middleware Update

**Files:**
- Modify: `src/middleware.ts`

- [ ] **Step 1: Replace middleware with portal-aware version**

Replace the full contents of `src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPortalPath = path.startsWith('/portal')
  const isPortalLogin = path === '/portal/login'
  const isStaffLogin = path === '/login'
  const isKlant = user?.user_metadata?.role === 'klant'

  if (!user) {
    if (isPortalPath && !isPortalLogin) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    if (!isPortalPath && !isStaffLogin) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Authenticated klant on portal login → go to dashboard
  if (isKlant && isPortalLogin) {
    return NextResponse.redirect(new URL('/portal/dashboard', request.url))
  }

  // Authenticated klant trying to access staff app → redirect to portal
  if (isKlant && !isPortalPath) {
    return NextResponse.redirect(new URL('/portal/dashboard', request.url))
  }

  // Authenticated staff trying to access portal → redirect to staff app
  if (!isKlant && isPortalPath) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Authenticated staff on staff login → go to app root
  if (!isKlant && isStaffLogin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: extend middleware for klant portal routing"
```

---

## Task 7: Portal Route Group — Layout and Login

**Files:**
- Create: `src/app/(portal)/layout.tsx`
- Create: `src/app/(portal)/login/page.tsx`

- [ ] **Step 1: Create the portal layout**

Create `src/app/(portal)/layout.tsx`:

```typescript
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create the portal login page**

Create `src/app/(portal)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PortalLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })

    if (error) {
      setFout('E-mailadres of wachtwoord onjuist.')
      setLaden(false)
      return
    }

    router.push('/portal/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon-preview.png" alt="Service Pack b.v." className="h-12 w-auto object-contain mb-6" />
        <h1 className="text-xl font-bold mb-1 text-gray-900">Klantportaal</h1>
        <p className="text-sm text-gray-500 mb-6">Log in om uw orders te bekijken.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
            <input
              type="password"
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              required
              className="form-input"
            />
          </div>
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <button type="submit" disabled={laden} className="btn-primary w-full">
            {laden ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(portal\)/layout.tsx src/app/\(portal\)/login/page.tsx
git commit -m "feat: add portal layout and login page"
```

---

## Task 8: PortalOrderLijst Component

**Files:**
- Create: `src/components/portal/PortalOrderLijst.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/portal/PortalOrderLijst.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { PortalOrder } from '@/types'
import { statusLabel, statusKleurKlasse } from '@/lib/utils/portal-status'

export function PortalOrderLijst({ orders }: { orders: PortalOrder[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (orders.length === 0) {
    return <p className="text-sm text-gray-400">Geen actieve orders gevonden.</p>
  }

  return (
    <div className="space-y-2">
      {orders.map(order => (
        <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenId(openId === order.id ? null : order.id)}
            className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 grid grid-cols-5 gap-4 items-center text-sm min-w-0">
              <span className="font-medium text-gray-900 truncate">{order.order_nummer}</span>
              <span className="font-mono text-xs text-gray-500 truncate">{order.order_code}</span>
              <span className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-medium ${statusKleurKlasse(order.status)}`}>
                {statusLabel(order.status)}
              </span>
              <span className="text-right tabular-nums text-gray-700">
                {order.order_grootte.toLocaleString('nl-NL')} st.
              </span>
              <span className="text-gray-400 text-xs text-right">{order.deadline ?? '—'}</span>
            </div>
            <span className="text-gray-300 text-xs ml-2 flex-shrink-0">
              {openId === order.id ? '▲' : '▼'}
            </span>
          </button>

          {openId === order.id && (
            <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
              <div className="grid grid-cols-5 gap-4 mb-5">
                <Detail label="THT" value={order.tht ?? '—'} />
                <Detail label="Pallettype" value={order.pallet_type} />
                <Detail label="Per doos" value={String(order.aantal_per_doos)} />
                <Detail label="Per inner" value={String(order.aantal_per_inner)} />
                <Detail label="Per pallet" value={String(order.aantal_per_pallet)} />
              </div>

              {order.leveringen.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Leveringen
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 font-medium text-gray-500">Datum</th>
                        <th className="text-right py-1.5 font-medium text-gray-500">Aantal</th>
                        <th className="text-left py-1.5 pl-4 font-medium text-gray-500">Notities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.leveringen.map(l => (
                        <tr key={l.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-1.5 text-gray-700">{l.leverdatum}</td>
                          <td className="py-1.5 text-right tabular-nums text-gray-700">
                            {l.aantal_geleverd.toLocaleString('nl-NL')}
                          </td>
                          <td className="py-1.5 pl-4 text-gray-400">{l.notities || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-xs text-gray-400">Nog geen leveringen voor deze order.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-400 mb-0.5">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/PortalOrderLijst.tsx
git commit -m "feat: add PortalOrderLijst component with expandable leveringen"
```

---

## Task 9: Portal Dashboard Page

**Files:**
- Create: `src/app/(portal)/dashboard/page.tsx`

- [ ] **Step 1: Create the dashboard page**

Create `src/app/(portal)/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPortalOrders } from '@/lib/db/portal'
import { portalUitloggen } from '@/lib/actions/portal'
import { PortalOrderLijst } from '@/components/portal/PortalOrderLijst'

export default async function PortalDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal/login')

  const { data: klant } = await supabase
    .from('klanten')
    .select('id, naam')
    .eq('portal_user_id', user.id)
    .single()

  if (!klant) redirect('/portal/login')

  const orders = await getPortalOrders(klant.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon-preview.png" alt="Service Pack b.v." className="h-10 w-auto object-contain" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 font-medium">{klant.naam}</span>
          <form action={portalUitloggen}>
            <button type="submit" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
              Uitloggen
            </button>
          </form>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Uw orders ({orders.length})
        </h1>
        <PortalOrderLijst orders={orders} />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(portal\)/dashboard/page.tsx
git commit -m "feat: add portal dashboard page"
```

---

## Task 10: Staff Invite UI and Klant Detail Update

**Files:**
- Create: `src/components/portal/PortalToegang.tsx`
- Modify: `src/app/(app)/klanten/[id]/page.tsx`

- [ ] **Step 1: Create the PortalToegang component**

Create `src/components/portal/PortalToegang.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { uitnodigingVersturen, toegangIntrekken } from '@/lib/actions/portal'

interface Props {
  klantId: string
  klantEmail: string | null
  portalUserId: string | null
}

export function PortalToegang({ klantId, klantEmail, portalUserId }: Props) {
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  async function handleUitnodiging() {
    if (!klantEmail) return
    setBezig(true)
    setFout(null)
    try {
      await uitnodigingVersturen(klantId, klantEmail)
    } catch {
      setFout('Er ging iets mis. Controleer of het e-mailadres correct is ingesteld.')
    } finally {
      setBezig(false)
    }
  }

  async function handleIntrekken() {
    if (!portalUserId) return
    setBezig(true)
    setFout(null)
    try {
      await toegangIntrekken(klantId, portalUserId)
    } catch {
      setFout('Er ging iets mis bij het intrekken van de toegang.')
    } finally {
      setBezig(false)
    }
  }

  return (
    <div>
      {portalUserId ? (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Portaaltoegang actief
          </span>
          <button
            type="button"
            onClick={handleIntrekken}
            disabled={bezig}
            className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {bezig ? 'Bezig...' : 'Toegang intrekken'}
          </button>
        </div>
      ) : klantEmail ? (
        <button
          type="button"
          onClick={handleUitnodiging}
          disabled={bezig}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {bezig ? 'Versturen...' : 'Stuur uitnodiging'}
        </button>
      ) : (
        <p className="text-sm text-gray-400">
          Geen e-mailadres ingesteld — voeg eerst een e-mailadres toe aan deze klant.
        </p>
      )}
      {fout && <p className="mt-2 text-xs text-red-600">{fout}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Add portal section to klant detail page**

In `src/app/(app)/klanten/[id]/page.tsx`, add the import at the top (after existing imports):

```typescript
import { PortalToegang } from '@/components/portal/PortalToegang'
```

Then add a new section between the orders section and the "gevaarlijke zone" section. Find the block that starts with `{/* Klant verwijderen */}` and insert this section before it:

```typescript
      {/* Portaaltoegang */}
      <section className="mb-10 pt-6 border-t border-gray-100">
        <h2 className="text-lg font-semibold mb-1">Portaaltoegang</h2>
        <p className="text-sm text-gray-400 mb-4">
          Geef deze klant toegang tot het klantportaal om eigen orders te bekijken.
        </p>
        <PortalToegang
          klantId={klant.id}
          klantEmail={klant.email}
          portalUserId={klant.portal_user_id}
        />
      </section>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/portal/PortalToegang.tsx src/app/\(app\)/klanten/\[id\]/page.tsx
git commit -m "feat: add PortalToegang component and portal section to klant detail"
```

---

## Final Check

- [ ] **Verify the full build completes**

```bash
npx next build
```

Expected: build succeeds with no TypeScript or compilation errors.

- [ ] **Manual smoke test checklist**

1. Visit `/portal/login` — login form appears, no staff nav visible
2. Staff user visiting `/portal/login` gets redirected to `/`
3. On `/klanten/[id]` for a klant without email → shows "Geen e-mailadres ingesteld" message
4. On `/klanten/[id]` for a klant with email → "Stuur uitnodiging" button appears
5. After invite sent → button changes to "Portaaltoegang actief" badge + "Toegang intrekken"
6. Portal user logging in → lands on `/portal/dashboard` with their orders
7. Portal user orders do not show `locatie` or `facturatie_code`
8. Clicking an order row expands leveringen
9. Portal user logging out → redirected to `/portal/login`
