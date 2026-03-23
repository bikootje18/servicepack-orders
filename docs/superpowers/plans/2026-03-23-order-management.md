# Order Management Web App – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Next.js + Supabase web app for a Dutch copacker to manage orders from creation through delivery and invoicing, with a warehouse stock overview.

**Architecture:** Single Next.js 14 App Router application with Server Components and Server Actions communicating directly with Supabase. Auth handled by Supabase Auth with middleware protecting all routes except `/login`. PDFs generated client-side via react-pdf.

**Tech Stack:** Next.js 14 (App Router), Supabase (PostgreSQL + Auth), Tailwind CSS, react-pdf, Vitest (unit tests), TypeScript

---

## File Structure

```
src/
  app/
    (auth)/
      login/page.tsx                  → Login page
    (app)/
      layout.tsx                      → Protected layout with nav
      page.tsx                        → Dashboard
      orders/
        page.tsx                      → Order list
        nieuw/page.tsx                → Create/clone order
        [id]/page.tsx                 → Order detail
        [id]/bewerken/page.tsx        → Edit order
      facturen/
        page.tsx                      → Invoice list
        [id]/page.tsx                 → Invoice detail + print
      voorraad/
        page.tsx                      → Stock overview
      klanten/
        page.tsx                      → Customer management
      codes/
        page.tsx                      → Billing codes management
  components/
    orders/
      OrderForm.tsx                   → Shared create/edit form
      OrderList.tsx                   → Paginated order table
      CloneOrderModal.tsx             → Search + select order to clone
      StatusBadge.tsx                 → Color-coded status pill
      StatusButtons.tsx               → Manual status transition buttons
    leveringen/
      LeveringForm.tsx                → Add delivery form
      LeveringenList.tsx              → Deliveries table on order detail
    facturen/
      FactuurForm.tsx                 → Select deliveries + create invoice
      FactuurDocument.tsx             → react-pdf document component
    voorraad/
      VoorraadTabel.tsx               → Stock table grouped by customer
      VoorraadDocument.tsx           → react-pdf per-customer export
    ui/
      Pagination.tsx                  → Reusable pagination controls
      Modal.tsx                       → Reusable modal wrapper
      EmptyState.tsx                  → Empty list placeholder
  lib/
    supabase/
      client.ts                       → Browser Supabase client
      server.ts                       → Server Supabase client (SSR)
      middleware.ts                   → Auth session refresh + route protection
    db/
      klanten.ts                      → DB queries: klanten
      codes.ts                        → DB queries: facturatie_codes
      orders.ts                       → DB queries: orders
      leveringen.ts                   → DB queries: leveringen
      facturen.ts                     → DB queries: facturen
      voorraad.ts                     → DB queries: derived stock
    pdf/
      factuur.tsx                     → Invoice PDF generation helper
      voorraad.tsx                    → Stock PDF generation helper
    utils/
      formatters.ts                   → Currency, date, number formatters (Dutch locale)
  types/
    index.ts                          → Shared TypeScript types from DB schema
supabase/
  migrations/
    001_schema.sql                    → All tables + enums
    002_sequences.sql                 → factuur_nummer sequence + generator function
    003_rls.sql                       → Row Level Security policies
    004_triggers.sql                  → Auto-status triggers on orders
  seed.sql                            → Dev seed data
```

---

## Task 1: Project Setup

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Create: `.env.local.example`
- Create: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Scaffold Next.js project**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr @react-pdf/renderer
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create `.env.local.example`**

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Copy to `.env.local` and fill in your Supabase project values.

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 5: Create `src/test/setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

Add to scripts: `"test": "vitest"`, `"test:run": "vitest run"`

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: initial Next.js + Supabase + Tailwind setup"
```

---

## Task 2: Supabase Schema

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_sequences.sql`
- Create: `supabase/migrations/003_rls.sql`
- Create: `supabase/migrations/004_triggers.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 1: Create `supabase/migrations/001_schema.sql`**

```sql
-- Enums
CREATE TYPE order_status AS ENUM (
  'concept', 'bevestigd', 'in_behandeling', 'geleverd', 'gefactureerd'
);

CREATE TYPE factuur_status AS ENUM ('concept', 'verzonden', 'betaald');

-- Klanten
CREATE TABLE klanten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  naam text NOT NULL,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Facturatie codes
CREATE TABLE facturatie_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  omschrijving text NOT NULL,
  tarief numeric(10, 4) NOT NULL,
  actief boolean NOT NULL DEFAULT true,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Profielen (mirrors auth.users for display names)
CREATE TABLE profielen (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  naam text NOT NULL,
  email text NOT NULL,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_nummer text NOT NULL UNIQUE,
  order_code text NOT NULL,
  klant_id uuid NOT NULL REFERENCES klanten(id),
  facturatie_code_id uuid NOT NULL REFERENCES facturatie_codes(id),
  order_grootte integer NOT NULL CHECK (order_grootte > 0),
  aantal_per_doos integer NOT NULL DEFAULT 0,
  aantal_per_inner integer NOT NULL DEFAULT 0,
  aantal_per_pallet integer NOT NULL DEFAULT 0,
  bewerking text NOT NULL DEFAULT '',
  opwerken boolean NOT NULL DEFAULT false,
  omschrijving text NOT NULL DEFAULT '',
  status order_status NOT NULL DEFAULT 'concept',
  aangemaakt_door uuid REFERENCES profielen(id),
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Facturen (created before leveringen FK to avoid circular reference)
CREATE TABLE facturen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factuur_nummer text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders(id),
  totaal_eenheden integer NOT NULL,
  tarief numeric(10, 4) NOT NULL,
  totaal_bedrag numeric(12, 2) NOT NULL,
  status factuur_status NOT NULL DEFAULT 'concept',
  factuurdatum date NOT NULL DEFAULT CURRENT_DATE,
  aangemaakt_door uuid REFERENCES profielen(id),
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);

-- Leveringen
CREATE TABLE leveringen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  factuur_id uuid REFERENCES facturen(id),
  aantal_geleverd integer NOT NULL CHECK (aantal_geleverd > 0),
  leverdatum date NOT NULL,
  notities text NOT NULL DEFAULT '',
  aangemaakt_door uuid REFERENCES profielen(id),
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 2: Create `supabase/migrations/002_sequences.sql`**

```sql
-- Sequence for invoice numbers per year
CREATE SEQUENCE factuur_nummer_seq START 1;

-- Function to generate factuur_nummer atomically
CREATE OR REPLACE FUNCTION generate_factuur_nummer()
RETURNS text AS $$
DECLARE
  jaar text := to_char(CURRENT_DATE, 'YYYY');
  volgnummer text;
BEGIN
  volgnummer := lpad(nextval('factuur_nummer_seq')::text, 4, '0');
  RETURN jaar || '-' || volgnummer;
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 3: Create `supabase/migrations/003_rls.sql`**

```sql
-- Enable RLS on all tables
ALTER TABLE klanten ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturatie_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profielen ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE leveringen ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturen ENABLE ROW LEVEL SECURITY;

-- All authenticated users have full access
CREATE POLICY "Authenticated users can do everything on klanten"
  ON klanten FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on facturatie_codes"
  ON facturatie_codes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can read all profielen"
  ON profielen FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profiel"
  ON profielen FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Authenticated users can do everything on orders"
  ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on leveringen"
  ON leveringen FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on facturen"
  ON facturen FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 4: Create `supabase/migrations/004_triggers.sql`**

```sql
-- Auto-update order status to 'geleverd' when all units are delivered
CREATE OR REPLACE FUNCTION check_order_geleverd()
RETURNS TRIGGER AS $$
DECLARE
  totaal_geleverd integer;
  order_grootte integer;
BEGIN
  SELECT COALESCE(SUM(aantal_geleverd), 0)
  INTO totaal_geleverd
  FROM leveringen
  WHERE order_id = NEW.order_id;

  SELECT o.order_grootte INTO order_grootte
  FROM orders o WHERE o.id = NEW.order_id;

  IF totaal_geleverd >= order_grootte THEN
    UPDATE orders SET status = 'geleverd'
    WHERE id = NEW.order_id AND status NOT IN ('geleverd', 'gefactureerd');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_order_geleverd
  AFTER INSERT OR UPDATE ON leveringen
  FOR EACH ROW EXECUTE FUNCTION check_order_geleverd();

-- Auto-update order status to 'gefactureerd' when all deliveries are invoiced
CREATE OR REPLACE FUNCTION check_order_gefactureerd()
RETURNS TRIGGER AS $$
DECLARE
  ongefactureerd integer;
BEGIN
  SELECT COUNT(*) INTO ongefactureerd
  FROM leveringen
  WHERE order_id = NEW.order_id AND factuur_id IS NULL;

  IF ongefactureerd = 0 THEN
    UPDATE orders SET status = 'gefactureerd'
    WHERE id = NEW.order_id AND status = 'geleverd';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_order_gefactureerd
  AFTER UPDATE OF factuur_id ON leveringen
  FOR EACH ROW EXECUTE FUNCTION check_order_gefactureerd();
```

- [ ] **Step 5: Create `supabase/seed.sql`**

```sql
-- Sample klanten
INSERT INTO klanten (naam) VALUES
  ('Bedrijf Alpha BV'),
  ('Beta Logistics NV'),
  ('Gamma Foods BV');

-- Sample facturatie codes
INSERT INTO facturatie_codes (code, omschrijving, tarief) VALUES
  ('alpha_sticker_laptop01', 'Laptop stickers Alpha', 0.85),
  ('beta_label_fles01', 'Fles labelen Beta', 0.45),
  ('gamma_verpak_doos01', 'Dozen verpakken Gamma', 1.20);
```

- [ ] **Step 6: Apply migrations to Supabase**

In Supabase Dashboard → SQL Editor, run each migration file in order (001 → 002 → 003 → 004). Then run seed.sql.

- [ ] **Step 7: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema, RLS policies, and triggers"
```

---

## Task 3: TypeScript Types & Supabase Clients

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/utils/formatters.ts`

- [ ] **Step 1: Write failing test for formatters**

Create `src/lib/utils/formatters.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatAantal } from './formatters'

describe('formatCurrency', () => {
  it('formats euros in Dutch locale', () => {
    expect(formatCurrency(1234.5)).toBe('€ 1.234,50')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('€ 0,00')
  })
})

describe('formatDate', () => {
  it('formats date in Dutch format', () => {
    expect(formatDate('2026-03-23')).toBe('23-03-2026')
  })
})

describe('formatAantal', () => {
  it('formats integers with Dutch thousands separator', () => {
    expect(formatAantal(1000)).toBe('1.000')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/utils/formatters.test.ts
```
Expected: FAIL → module not found

- [ ] **Step 3: Create `src/lib/utils/formatters.ts`**

```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}-${month}-${year}`
}

export function formatAantal(n: number): string {
  return new Intl.NumberFormat('nl-NL').format(n)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/utils/formatters.test.ts
```
Expected: PASS

- [ ] **Step 5: Create `src/types/index.ts`**

```typescript
export type OrderStatus = 'concept' | 'bevestigd' | 'in_behandeling' | 'geleverd' | 'gefactureerd'
export type FactuurStatus = 'concept' | 'verzonden' | 'betaald'

export interface Klant {
  id: string
  naam: string
  aangemaakt_op: string
}

export interface FacturatieCode {
  id: string
  code: string
  omschrijving: string
  tarief: number
  actief: boolean
  aangemaakt_op: string
}

export interface Profiel {
  id: string
  naam: string
  email: string
}

export interface Order {
  id: string
  order_nummer: string
  order_code: string
  klant_id: string
  facturatie_code_id: string
  order_grootte: number
  aantal_per_doos: number
  aantal_per_inner: number
  aantal_per_pallet: number
  bewerking: string
  opwerken: boolean
  omschrijving: string
  status: OrderStatus
  aangemaakt_door: string | null
  aangemaakt_op: string
  // Joins
  klant?: Klant
  facturatie_code?: FacturatieCode
}

export interface Levering {
  id: string
  order_id: string
  factuur_id: string | null
  aantal_geleverd: number
  leverdatum: string
  notities: string
  aangemaakt_door: string | null
  aangemaakt_op: string
}

export interface Factuur {
  id: string
  factuur_nummer: string
  order_id: string
  totaal_eenheden: number
  tarief: number
  totaal_bedrag: number
  status: FactuurStatus
  factuurdatum: string
  aangemaakt_door: string | null
  aangemaakt_op: string
  // Joins
  order?: Order
}

export interface VoorraadRegel {
  order_id: string
  order_nummer: string
  klant_naam: string
  order_grootte: number
  totaal_geleverd: number
  resterend: number
}
```

- [ ] **Step 6: Create `src/lib/supabase/client.ts`**

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 7: Create `src/lib/supabase/server.ts`**

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 8: Create `src/middleware.ts`**

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

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: add types, Supabase clients, auth middleware, and formatters"
```

---

## Task 4: Auth – Login Page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Create `src/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/(auth)/login/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
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

    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Inloggen</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
          <input
            type="password"
            value={wachtwoord}
            onChange={e => setWachtwoord(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {fout && <p className="text-sm text-red-600">{fout}</p>}
        <button
          type="submit"
          disabled={laden}
          className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {laden ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create users in Supabase Dashboard**

Go to Supabase Dashboard → Authentication → Users → Add User. Create accounts for all team members.

- [ ] **Step 4: Start dev server and verify login works**

```bash
npm run dev
```

Open `http://localhost:3000`. Should redirect to `/login`. Log in with a test account. Should redirect to `/` (404 for now is fine).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add login page with Supabase auth"
```

---

## Task 5: App Shell & Navigation

**Files:**
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/page.tsx` (placeholder)
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'OSS – Orderbeheer' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Create `src/app/(app)/layout.tsx`**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/orders', label: 'Orders' },
  { href: '/facturen', label: 'Facturen' },
  { href: '/voorraad', label: 'Voorraad' },
  { href: '/klanten', label: 'Klanten' },
  { href: '/codes', label: 'Codes' },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-700 text-lg">OSS</span>
        <nav className="flex gap-4 text-sm">
          {nav.map(({ href, label }) => (
            <Link key={href} href={href} className="text-gray-600 hover:text-gray-900">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/(app)/page.tsx` placeholder**

```tsx
export default function DashboardPage() {
  return <h1 className="text-2xl font-bold">Dashboard</h1>
}
```

- [ ] **Step 4: Verify navigation renders after login**

```bash
npm run dev
```

Log in → should see nav bar with all links.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/
git commit -m "feat: add app shell with navigation"
```

---

## Task 6: Klanten (Customer Management)

**Files:**
- Create: `src/lib/db/klanten.ts`
- Create: `src/app/(app)/klanten/page.tsx`

- [ ] **Step 1: Write failing tests for klanten DB functions**

Create `src/lib/db/klanten.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildKlantQuery, validateKlant } from './klanten'

describe('validateKlant', () => {
  it('rejects empty naam', () => {
    expect(validateKlant({ naam: '' })).toEqual({ naam: 'Naam is verplicht' })
  })
  it('accepts valid naam', () => {
    expect(validateKlant({ naam: 'Bedrijf X' })).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/db/klanten.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create `src/lib/db/klanten.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Klant } from '@/types'

export function validateKlant(data: { naam: string }): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.naam.trim()) errors.naam = 'Naam is verplicht'
  return errors
}

export function buildKlantQuery(naam: string) {
  return { naam: naam.trim() }
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

export async function createKlant(naam: string): Promise<Klant> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('klanten')
    .insert({ naam: naam.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateKlant(id: string, naam: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('klanten')
    .update({ naam: naam.trim() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteKlant(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('klanten').delete().eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/db/klanten.test.ts
```
Expected: PASS

- [ ] **Step 5: Create `src/app/(app)/klanten/page.tsx`**

```tsx
import { getKlanten, createKlant, updateKlant, deleteKlant } from '@/lib/db/klanten'
import { revalidatePath } from 'next/cache'

export default async function KlantenPage() {
  const klanten = await getKlanten()

  async function maakKlantAan(formData: FormData) {
    'use server'
    const naam = formData.get('naam') as string
    if (naam?.trim()) {
      await createKlant(naam)
      revalidatePath('/klanten')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Klanten</h1>

      <form action={maakKlantAan} className="flex gap-2 mb-6">
        <input
          name="naam"
          placeholder="Bedrijfsnaam"
          required
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
        >
          Toevoegen
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Naam</th>
          </tr>
        </thead>
        <tbody>
          {klanten.map(klant => (
            <tr key={klant.id} className="border-b border-gray-100">
              <td className="py-2">{klant.naam}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: Verify klanten page works**

Open `http://localhost:3000/klanten`. Add a test customer and verify it appears in the list.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/klanten.ts src/lib/db/klanten.test.ts src/app/\(app\)/klanten/
git commit -m "feat: add klanten management page"
```

---

## Task 7: Facturatie Codes Management

**Files:**
- Create: `src/lib/db/codes.ts`
- Create: `src/app/(app)/codes/page.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/lib/db/codes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateCode } from './codes'

describe('validateCode', () => {
  it('rejects empty code', () => {
    const errors = validateCode({ code: '', omschrijving: 'Test', tarief: 1 })
    expect(errors.code).toBeDefined()
  })
  it('rejects negative tarief', () => {
    const errors = validateCode({ code: 'abc', omschrijving: 'Test', tarief: -1 })
    expect(errors.tarief).toBeDefined()
  })
  it('accepts valid code', () => {
    const errors = validateCode({ code: 'abc_01', omschrijving: 'Test', tarief: 1.5 })
    expect(errors).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/db/codes.test.ts
```

- [ ] **Step 3: Create `src/lib/db/codes.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { FacturatieCode } from '@/types'

export function validateCode(data: { code: string; omschrijving: string; tarief: number }): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.code.trim()) errors.code = 'Code is verplicht'
  if (!data.omschrijving.trim()) errors.omschrijving = 'Omschrijving is verplicht'
  if (data.tarief <= 0) errors.tarief = 'Tarief moet groter zijn dan 0'
  return errors
}

export async function getCodes(inclusiefInactief = false): Promise<FacturatieCode[]> {
  const supabase = await createClient()
  let query = supabase.from('facturatie_codes').select('*').order('code')
  if (!inclusiefInactief) query = query.eq('actief', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createCode(data: { code: string; omschrijving: string; tarief: number }): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('facturatie_codes').insert(data)
  if (error) throw error
}

export async function updateCode(id: string, data: { omschrijving?: string; tarief?: number }): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('facturatie_codes').update(data).eq('id', id)
  if (error) throw error
}

export async function toggleCodeActief(id: string, actief: boolean): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('facturatie_codes').update({ actief }).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/db/codes.test.ts
```

- [ ] **Step 5: Create `src/app/(app)/codes/page.tsx`**

```tsx
import { getCodes, createCode, toggleCodeActief } from '@/lib/db/codes'
import { revalidatePath } from 'next/cache'
import { formatCurrency } from '@/lib/utils/formatters'

export default async function CodesPage() {
  const codes = await getCodes(true)

  async function maakCodeAan(formData: FormData) {
    'use server'
    await createCode({
      code: formData.get('code') as string,
      omschrijving: formData.get('omschrijving') as string,
      tarief: parseFloat(formData.get('tarief') as string),
    })
    revalidatePath('/codes')
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Facturatie codes</h1>

      <form action={maakCodeAan} className="grid grid-cols-3 gap-2 mb-6">
        <input name="code" placeholder="Code" required
          className="border border-gray-300 rounded px-3 py-2 text-sm" />
        <input name="omschrijving" placeholder="Omschrijving" required
          className="border border-gray-300 rounded px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input name="tarief" type="number" step="0.0001" min="0.0001" placeholder="Tarief (€)"
            required className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm" />
          <button type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
            Toevoegen
          </button>
        </div>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Code</th>
            <th className="text-left py-2 font-medium text-gray-600">Omschrijving</th>
            <th className="text-right py-2 font-medium text-gray-600">Tarief</th>
            <th className="text-center py-2 font-medium text-gray-600">Actief</th>
          </tr>
        </thead>
        <tbody>
          {codes.map(code => (
            <tr key={code.id} className={`border-b border-gray-100 ${!code.actief ? 'opacity-50' : ''}`}>
              <td className="py-2 font-mono text-xs">{code.code}</td>
              <td className="py-2">{code.omschrijving}</td>
              <td className="py-2 text-right">{formatCurrency(code.tarief)}</td>
              <td className="py-2 text-center">{code.actief ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: Verify codes page works**

Open `http://localhost:3000/codes`. Verify seeded codes appear and new codes can be added.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/codes.ts src/lib/db/codes.test.ts src/app/\(app\)/codes/
git commit -m "feat: add facturatie codes management page"
```

---

## Task 8: Orders – DB Layer

**Files:**
- Create: `src/lib/db/orders.ts`

- [ ] **Step 1: Write failing tests for order validation**

Create `src/lib/db/orders.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateOrder, berekenResterend } from './orders'

describe('validateOrder', () => {
  const base = {
    order_nummer: 'ORD-001',
    order_code: 'alpha_sticker',
    klant_id: 'uuid-1',
    facturatie_code_id: 'uuid-2',
    order_grootte: 100,
  }

  it('rejects empty order_nummer', () => {
    const errors = validateOrder({ ...base, order_nummer: '' })
    expect(errors.order_nummer).toBeDefined()
  })
  it('rejects order_grootte of 0', () => {
    const errors = validateOrder({ ...base, order_grootte: 0 })
    expect(errors.order_grootte).toBeDefined()
  })
  it('accepts valid order', () => {
    expect(validateOrder(base)).toEqual({})
  })
})

describe('berekenResterend', () => {
  it('returns order_grootte minus total delivered', () => {
    expect(berekenResterend(100, 40)).toBe(60)
  })
  it('returns 0 when fully delivered', () => {
    expect(berekenResterend(100, 100)).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/db/orders.test.ts
```

- [ ] **Step 3: Create `src/lib/db/orders.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Order } from '@/types'

export function validateOrder(data: {
  order_nummer: string
  order_code: string
  klant_id: string
  facturatie_code_id: string
  order_grootte: number
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.order_nummer.trim()) errors.order_nummer = 'Ordernummer is verplicht'
  if (!data.order_code.trim()) errors.order_code = 'Order code is verplicht'
  if (!data.klant_id) errors.klant_id = 'Klant is verplicht'
  if (!data.facturatie_code_id) errors.facturatie_code_id = 'Facturatie code is verplicht'
  if (!data.order_grootte || data.order_grootte <= 0) errors.order_grootte = 'Order grootte moet groter zijn dan 0'
  return errors
}

export function berekenResterend(orderGrootte: number, totaalGeleverd: number): number {
  return Math.max(0, orderGrootte - totaalGeleverd)
}

export async function getOrders(page = 1, perPagina = 50): Promise<{ orders: Order[]; totaal: number }> {
  const supabase = await createClient()
  const van = (page - 1) * perPagina
  const tot = van + perPagina - 1

  const { data, count, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam), facturatie_code:facturatie_codes(id, code, tarief)', { count: 'exact' })
    .order('aangemaakt_op', { ascending: false })
    .range(van, tot)

  if (error) throw error
  return { orders: data as Order[], totaal: count ?? 0 }
}

export async function getOrder(id: string): Promise<Order> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam), facturatie_code:facturatie_codes(id, code, omschrijving, tarief)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Order
}

export async function zoekOrdersVoorKloon(zoekterm: string): Promise<Order[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*, klant:klanten(id, naam)')
    .or(`order_code.ilike.%${zoekterm}%,klanten.naam.ilike.%${zoekterm}%`)
    .order('aangemaakt_op', { ascending: false })
    .limit(20)
  if (error) throw error
  return data as Order[]
}

export async function createOrder(data: Omit<Order, 'id' | 'status' | 'aangemaakt_op' | 'klant' | 'facturatie_code'>): Promise<Order> {
  const supabase = await createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .insert({ ...data, status: 'concept' })
    .select()
    .single()
  if (error) throw error
  return order
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update(data)
    .eq('id', id)
  if (error) throw error
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/db/orders.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/orders.ts src/lib/db/orders.test.ts
git commit -m "feat: add orders DB layer with validation"
```

---

## Task 9: Orders – Pages

**Files:**
- Create: `src/components/orders/StatusBadge.tsx`
- Create: `src/components/orders/StatusButtons.tsx`
- Create: `src/components/ui/Pagination.tsx`
- Create: `src/app/(app)/orders/page.tsx`
- Create: `src/app/(app)/orders/nieuw/page.tsx`
- Create: `src/app/(app)/orders/[id]/page.tsx`
- Create: `src/app/(app)/orders/[id]/bewerken/page.tsx`

- [ ] **Step 1: Create `src/components/orders/StatusBadge.tsx`**

```tsx
import type { OrderStatus } from '@/types'

const kleuren: Record<OrderStatus, string> = {
  concept: 'bg-gray-100 text-gray-700',
  bevestigd: 'bg-blue-100 text-blue-700',
  in_behandeling: 'bg-yellow-100 text-yellow-700',
  geleverd: 'bg-green-100 text-green-700',
  gefactureerd: 'bg-purple-100 text-purple-700',
}

const labels: Record<OrderStatus, string> = {
  concept: 'Concept',
  bevestigd: 'Bevestigd',
  in_behandeling: 'In behandeling',
  geleverd: 'Geleverd',
  gefactureerd: 'Gefactureerd',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${kleuren[status]}`}>
      {labels[status]}
    </span>
  )
}
```

- [ ] **Step 2: Create `src/components/ui/Pagination.tsx`**

```tsx
import Link from 'next/link'

interface Props {
  pagina: number
  totaalPaginas: number
  basisUrl: string
}

export function Pagination({ pagina, totaalPaginas, basisUrl }: Props) {
  if (totaalPaginas <= 1) return null
  return (
    <div className="flex gap-2 mt-4 text-sm">
      {pagina > 1 && (
        <Link href={`${basisUrl}?pagina=${pagina - 1}`}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
          ← Vorige
        </Link>
      )}
      <span className="px-3 py-1 text-gray-600">
        {pagina} / {totaalPaginas}
      </span>
      {pagina < totaalPaginas && (
        <Link href={`${basisUrl}?pagina=${pagina + 1}`}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
          Volgende →
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/(app)/orders/page.tsx`**

```tsx
import Link from 'next/link'
import { getOrders } from '@/lib/db/orders'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate } from '@/lib/utils/formatters'

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>
}) {
  const params = await searchParams
  const pagina = parseInt(params.pagina ?? '1')
  const perPagina = 50
  const { orders, totaal } = await getOrders(pagina, perPagina)
  const totaalPaginas = Math.ceil(totaal / perPagina)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link href="/orders/nieuw"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
          + Nieuwe order
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Ordernummer</th>
            <th className="text-left py-2 font-medium text-gray-600">Klant</th>
            <th className="text-left py-2 font-medium text-gray-600">Order code</th>
            <th className="text-right py-2 font-medium text-gray-600">Grootte</th>
            <th className="text-left py-2 font-medium text-gray-600">Status</th>
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {order.order_nummer}
                </Link>
              </td>
              <td className="py-2">{order.klant?.naam}</td>
              <td className="py-2 font-mono text-xs text-gray-500">{order.order_code}</td>
              <td className="py-2 text-right">{order.order_grootte.toLocaleString('nl-NL')}</td>
              <td className="py-2"><StatusBadge status={order.status} /></td>
              <td className="py-2 text-gray-500">{formatDate(order.aangemaakt_op.split('T')[0])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination pagina={pagina} totaalPaginas={totaalPaginas} basisUrl="/orders" />
    </div>
  )
}
```

- [ ] **Step 4: Create `src/app/(app)/orders/nieuw/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getKlanten } from '@/lib/db/klanten'
import { getCodes } from '@/lib/db/codes'
import { createOrder } from '@/lib/db/orders'
import { createClient } from '@/lib/supabase/server'

export default async function NieuweOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ kloon?: string }>
}) {
  const params = await searchParams
  const klanten = await getKlanten()
  const codes = await getCodes()

  // If kloon param, pre-fill from existing order
  let kloonOrder = null
  if (params.kloon) {
    const { getOrder } = await import('@/lib/db/orders')
    kloonOrder = await getOrder(params.kloon)
  }

  async function slaOrderOp(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const order = await createOrder({
      order_nummer: formData.get('order_nummer') as string,
      order_code: formData.get('order_code') as string,
      klant_id: formData.get('klant_id') as string,
      facturatie_code_id: formData.get('facturatie_code_id') as string,
      order_grootte: parseInt(formData.get('order_grootte') as string),
      aantal_per_doos: parseInt(formData.get('aantal_per_doos') as string) || 0,
      aantal_per_inner: parseInt(formData.get('aantal_per_inner') as string) || 0,
      aantal_per_pallet: parseInt(formData.get('aantal_per_pallet') as string) || 0,
      bewerking: formData.get('bewerking') as string || '',
      opwerken: formData.get('opwerken') === 'on',
      omschrijving: formData.get('omschrijving') as string || '',
      aangemaakt_door: user?.id ?? null,
    })
    redirect(`/orders/${order.id}`)
  }

  const v = kloonOrder

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">
        {v ? `Kloon van ${v.order_nummer}` : 'Nieuwe order'}
      </h1>
      <form action={slaOrderOp} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordernummer *</label>
            <input name="order_nummer" required
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order code *</label>
            <input name="order_code" required defaultValue={v?.order_code}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Klant *</label>
            <select name="klant_id" required defaultValue={v?.klant_id}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Selecteer klant...</option>
              {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code *</label>
            <select name="facturatie_code_id" required defaultValue={v?.facturatie_code_id}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
              <option value="">Selecteer code...</option>
              {codes.map(c => <option key={c.id} value={c.id}>{c.code} – {c.omschrijving}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order grootte *</label>
          <input name="order_grootte" type="number" min="1" required defaultValue={v?.order_grootte}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per doos</label>
            <input name="aantal_per_doos" type="number" min="0" defaultValue={v?.aantal_per_doos ?? 0}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per inner</label>
            <input name="aantal_per_inner" type="number" min="0" defaultValue={v?.aantal_per_inner ?? 0}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per pallet</label>
            <input name="aantal_per_pallet" type="number" min="0" defaultValue={v?.aantal_per_pallet ?? 0}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bewerking</label>
          <input name="bewerking" defaultValue={v?.bewerking}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-2">
          <input name="opwerken" type="checkbox" id="opwerken" defaultChecked={v?.opwerken} />
          <label htmlFor="opwerken" className="text-sm font-medium text-gray-700">Opwerken</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
          <textarea name="omschrijving" rows={3} defaultValue={v?.omschrijving}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>

        <div className="flex gap-3">
          <button type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700">
            Order opslaan
          </button>
          <a href="/orders" className="px-6 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50">
            Annuleren
          </a>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Create `src/app/(app)/orders/[id]/page.tsx`**

```tsx
import Link from 'next/link'
import { getOrder } from '@/lib/db/orders'
import { getLeveringen } from '@/lib/db/leveringen'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { StatusButtons } from '@/components/orders/StatusButtons'
import { LeveringForm } from '@/components/leveringen/LeveringForm'
import { LeveringenList } from '@/components/leveringen/LeveringenList'
import { berekenResterend } from '@/lib/db/orders'
import { formatDate, formatCurrency, formatAantal } from '@/lib/utils/formatters'

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getOrder(id)
  const leveringen = await getLeveringen(id)
  const totaalGeleverd = leveringen.reduce((sum, l) => sum + l.aantal_geleverd, 0)
  const resterend = berekenResterend(order.order_grootte, totaalGeleverd)

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold font-mono">{order.order_nummer}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-gray-500 text-sm">{order.klant?.naam} · {order.order_code}</p>
        </div>
        <Link href={`/orders/${id}/bewerken`}
          className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50">
          Bewerken
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Order grootte:</span> <strong>{formatAantal(order.order_grootte)}</strong></div>
        <div><span className="text-gray-500">Geleverd:</span> <strong>{formatAantal(totaalGeleverd)}</strong></div>
        <div><span className="text-gray-500">Resterend:</span> <strong>{formatAantal(resterend)}</strong></div>
        <div><span className="text-gray-500">Facturatie code:</span> <strong className="font-mono text-xs">{order.facturatie_code?.code}</strong></div>
        <div><span className="text-gray-500">Per doos/inner/pallet:</span> <strong>{order.aantal_per_doos} / {order.aantal_per_inner} / {order.aantal_per_pallet}</strong></div>
        <div><span className="text-gray-500">Bewerking:</span> <strong>{order.bewerking || '–'}</strong></div>
        {order.omschrijving && (
          <div className="col-span-2"><span className="text-gray-500">Omschrijving:</span> {order.omschrijving}</div>
        )}
      </div>

      <StatusButtons order={order} />

      <div className="mb-6">
        <Link href={`/orders/nieuw?kloon=${id}`}
          className="text-sm text-blue-600 hover:underline">
          + Nieuwe order op basis van deze order
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-3">Leveringen</h2>
      <LeveringForm orderId={id} orderGrootte={order.order_grootte} totaalGeleverd={totaalGeleverd} />
      <LeveringenList leveringen={leveringen} />

      {order.status === 'geleverd' && (
        <div className="mt-6">
          <Link href={`/facturen/nieuw?order_id=${id}`}
            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700">
            Factuur aanmaken
          </Link>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create `src/components/orders/StatusButtons.tsx`**

```tsx
'use client'

import { updateOrderStatus } from '@/lib/db/orders'
import { useRouter } from 'next/navigation'
import type { Order, OrderStatus } from '@/types'

const transities: Partial<Record<OrderStatus, { naar: OrderStatus; label: string }>> = {
  concept: { naar: 'bevestigd', label: 'Markeer als bevestigd' },
  bevestigd: { naar: 'in_behandeling', label: 'Start behandeling' },
}

export function StatusButtons({ order }: { order: Order }) {
  const router = useRouter()
  const transitie = transities[order.status]
  if (!transitie) return null

  async function handleStatusWijziging() {
    await updateOrderStatus(order.id, transitie!.naar)
    router.refresh()
  }

  return (
    <div className="mb-4">
      <button onClick={handleStatusWijziging}
        className="text-sm border border-blue-300 text-blue-700 px-3 py-1 rounded hover:bg-blue-50">
        {transitie.label}
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Verify orders pages work end-to-end**

- Create a new order at `/orders/nieuw`
- Verify it appears in the list at `/orders`
- Verify detail page shows correctly
- Verify status can be advanced

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add orders list, create, detail, and status pages"
```

---

## Task 10: Leveringen (Deliveries)

**Files:**
- Create: `src/lib/db/leveringen.ts`
- Create: `src/components/leveringen/LeveringForm.tsx`
- Create: `src/components/leveringen/LeveringenList.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/lib/db/leveringen.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { validateLevering } from './leveringen'

describe('validateLevering', () => {
  it('rejects aantal_geleverd > resterend', () => {
    const errors = validateLevering({ aantal_geleverd: 150, resterend: 100, leverdatum: '2026-03-23' })
    expect(errors.aantal_geleverd).toBeDefined()
  })
  it('rejects aantal_geleverd of 0', () => {
    const errors = validateLevering({ aantal_geleverd: 0, resterend: 100, leverdatum: '2026-03-23' })
    expect(errors.aantal_geleverd).toBeDefined()
  })
  it('accepts valid levering', () => {
    const errors = validateLevering({ aantal_geleverd: 50, resterend: 100, leverdatum: '2026-03-23' })
    expect(errors).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/db/leveringen.test.ts
```

- [ ] **Step 3: Create `src/lib/db/leveringen.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Levering } from '@/types'

export function validateLevering(data: {
  aantal_geleverd: number
  resterend: number
  leverdatum: string
}): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.aantal_geleverd || data.aantal_geleverd <= 0)
    errors.aantal_geleverd = 'Aantal moet groter zijn dan 0'
  if (data.aantal_geleverd > data.resterend)
    errors.aantal_geleverd = `Maximaal ${data.resterend} eenheden resterend`
  if (!data.leverdatum)
    errors.leverdatum = 'Leverdatum is verplicht'
  return errors
}

export async function getLeveringen(orderId: string): Promise<Levering[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leveringen')
    .select('*')
    .eq('order_id', orderId)
    .order('leverdatum', { ascending: false })
  if (error) throw error
  return data
}

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

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/db/leveringen.test.ts
```

- [ ] **Step 5: Create `src/components/leveringen/LeveringForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { createLevering } from '@/lib/db/leveringen'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  orderGrootte: number
  totaalGeleverd: number
}

export function LeveringForm({ orderId, orderGrootte, totaalGeleverd }: Props) {
  const router = useRouter()
  const resterend = orderGrootte - totaalGeleverd
  const [laden, setLaden] = useState(false)
  const [fout, setFout] = useState<string | null>(null)

  if (resterend === 0) {
    return <p className="text-sm text-green-600 mb-4">Volledig geleverd.</p>
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLaden(true)
    setFout(null)
    const formData = new FormData(e.currentTarget)
    const aantal = parseInt(formData.get('aantal_geleverd') as string)

    if (aantal > resterend) {
      setFout(`Maximaal ${resterend} eenheden resterend`)
      setLaden(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    await createLevering({
      order_id: orderId,
      aantal_geleverd: aantal,
      leverdatum: formData.get('leverdatum') as string,
      notities: formData.get('notities') as string || '',
      aangemaakt_door: user?.id ?? null,
    })

    router.refresh()
    setLaden(false)
    ;(e.target as HTMLFormElement).reset()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <p className="text-sm text-gray-500 mb-3">Resterend: <strong>{resterend.toLocaleString('nl-NL')}</strong> eenheden</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Aantal geleverd *</label>
          <input name="aantal_geleverd" type="number" min="1" max={resterend} required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Leverdatum *</label>
          <input name="leverdatum" type="date" required
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notities</label>
          <input name="notities"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
      </div>
      {fout && <p className="text-sm text-red-600 mt-2">{fout}</p>}
      <button type="submit" disabled={laden}
        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
        {laden ? 'Opslaan...' : 'Levering toevoegen'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Create `src/components/leveringen/LeveringenList.tsx`**

```tsx
import type { Levering } from '@/types'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

export function LeveringenList({ leveringen }: { leveringen: Levering[] }) {
  if (leveringen.length === 0) {
    return <p className="text-sm text-gray-500">Nog geen leveringen geregistreerd.</p>
  }
  return (
    <table className="w-full text-sm mb-6">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-2 font-medium text-gray-600">Datum</th>
          <th className="text-right py-2 font-medium text-gray-600">Aantal</th>
          <th className="text-left py-2 font-medium text-gray-600">Notities</th>
          <th className="text-center py-2 font-medium text-gray-600">Gefactureerd</th>
        </tr>
      </thead>
      <tbody>
        {leveringen.map(l => (
          <tr key={l.id} className="border-b border-gray-100">
            <td className="py-2">{formatDate(l.leverdatum)}</td>
            <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
            <td className="py-2 text-gray-500">{l.notities || '–'}</td>
            <td className="py-2 text-center">{l.factuur_id ? '✓' : '✗'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 7: Verify deliveries work**

Open an order detail page. Add a delivery. Verify remaining stock decreases and status updates automatically when fully delivered.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add leveringen (delivery) registration"
```

---

## Task 11: Facturen (Invoices)

**Files:**
- Create: `src/lib/db/facturen.ts`
- Create: `src/components/facturen/FactuurDocument.tsx`
- Create: `src/app/(app)/facturen/page.tsx`
- Create: `src/app/(app)/facturen/nieuw/page.tsx`
- Create: `src/app/(app)/facturen/[id]/page.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/lib/db/facturen.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { berekenFactuurBedrag } from './facturen'

describe('berekenFactuurBedrag', () => {
  it('multiplies tarief by total units', () => {
    expect(berekenFactuurBedrag(0.85, 1000)).toBe(850)
  })
  it('rounds to 2 decimal places', () => {
    expect(berekenFactuurBedrag(0.333, 3)).toBeCloseTo(1.0, 2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/db/facturen.test.ts
```

- [ ] **Step 3: Create `src/lib/db/facturen.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { Factuur, Levering } from '@/types'

export function berekenFactuurBedrag(tarief: number, totaalEenheden: number): number {
  return Math.round(tarief * totaalEenheden * 100) / 100
}

export async function getFacturen(): Promise<Factuur[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('facturen')
    .select('*, order:orders(id, order_nummer, klant:klanten(naam))')
    .order('aangemaakt_op', { ascending: false })
  if (error) throw error
  return data as Factuur[]
}

export async function getFactuur(id: string): Promise<Factuur> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('facturen')
    .select('*, order:orders(*, klant:klanten(naam), facturatie_code:facturatie_codes(code))')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Factuur
}

export async function getOngefactureerdeLeveringen(orderId: string): Promise<Levering[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leveringen')
    .select('*')
    .eq('order_id', orderId)
    .is('factuur_id', null)
    .order('leverdatum')
  if (error) throw error
  return data
}

export async function createFactuur(data: {
  order_id: string
  levering_ids: string[]
  tarief: number
  aangemaakt_door: string | null
}): Promise<Factuur> {
  const supabase = await createClient()

  const { data: leveringen, error: leveringenError } = await supabase
    .from('leveringen')
    .select('aantal_geleverd')
    .in('id', data.levering_ids)
  if (leveringenError) throw leveringenError

  const totaalEenheden = leveringen.reduce((sum, l) => sum + l.aantal_geleverd, 0)
  const totaalBedrag = berekenFactuurBedrag(data.tarief, totaalEenheden)

  const { data: factuurNummer, error: seqError } = await supabase.rpc('generate_factuur_nummer')
  if (seqError) throw seqError

  const { data: factuur, error: factuurError } = await supabase
    .from('facturen')
    .insert({
      factuur_nummer: factuurNummer,
      order_id: data.order_id,
      totaal_eenheden: totaalEenheden,
      tarief: data.tarief,
      totaal_bedrag: totaalBedrag,
      factuurdatum: new Date().toISOString().split('T')[0],
      aangemaakt_door: data.aangemaakt_door,
    })
    .select()
    .single()
  if (factuurError) throw factuurError

  const { error: linkError } = await supabase
    .from('leveringen')
    .update({ factuur_id: factuur.id })
    .in('id', data.levering_ids)
  if (linkError) throw linkError

  return factuur
}

export async function updateFactuurStatus(id: string, status: Factuur['status']): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('facturen').update({ status }).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/db/facturen.test.ts
```

- [ ] **Step 5: Create `src/components/facturen/FactuurDocument.tsx`**

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Factuur, Levering } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111' },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555' },
  section: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  total: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  disclaimer: { marginTop: 32, fontSize: 8, color: '#888' },
})

interface Props {
  factuur: Factuur
  leveringen: Levering[]
  klantNaam: string
}

export function FactuurDocument({ factuur, leveringen, klantNaam }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Factuur {factuur.factuur_nummer}</Text>
          <Text style={styles.subtitle}>{klantNaam}</Text>
          <Text style={styles.subtitle}>Datum: {factuur.factuurdatum}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Leverdatum</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Eenheden</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Tarief</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Bedrag</Text>
          </View>
          {leveringen.map(l => (
            <View key={l.id} style={styles.row}>
              <Text>{l.leverdatum}</Text>
              <Text>{l.aantal_geleverd.toLocaleString('nl-NL')}</Text>
              <Text>€ {factuur.tarief.toFixed(4)}</Text>
              <Text>€ {(factuur.tarief * l.aantal_geleverd).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.total}>
          <Text>Totaal excl. BTW</Text>
          <Text>€ {factuur.totaal_bedrag.toFixed(2)}</Text>
        </View>

        <Text style={styles.disclaimer}>
          Bedragen excl. BTW. Dit document is geen officieel belastingdocument.
        </Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 6: Create `src/app/(app)/facturen/nieuw/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getOrder } from '@/lib/db/orders'
import { getOngefactureerdeLeveringen, createFactuur } from '@/lib/db/facturen'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatCurrency, formatAantal } from '@/lib/utils/formatters'

export default async function NieuweFactuurPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id: string }>
}) {
  const { order_id } = await searchParams
  const order = await getOrder(order_id)
  const leveringen = await getOngefactureerdeLeveringen(order_id)

  async function maakFactuurAan(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const leveringIds = formData.getAll('levering_ids') as string[]
    if (leveringIds.length === 0) return

    const factuur = await createFactuur({
      order_id,
      levering_ids: leveringIds,
      tarief: order.facturatie_code!.tarief,
      aangemaakt_door: user?.id ?? null,
    })
    redirect(`/facturen/${factuur.id}`)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Factuur aanmaken</h1>
      <p className="text-gray-500 text-sm mb-6">Order {order.order_nummer} · {order.klant?.naam}</p>

      <form action={maakFactuurAan}>
        <h2 className="font-semibold mb-3">Selecteer leveringen</h2>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-8"></th>
              <th className="text-left py-2 font-medium text-gray-600">Datum</th>
              <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
              <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
            </tr>
          </thead>
          <tbody>
            {leveringen.map(l => (
              <tr key={l.id} className="border-b border-gray-100">
                <td className="py-2">
                  <input type="checkbox" name="levering_ids" value={l.id} defaultChecked />
                </td>
                <td className="py-2">{formatDate(l.leverdatum)}</td>
                <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
                <td className="py-2 text-right">{formatCurrency(order.facturatie_code!.tarief * l.aantal_geleverd)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-sm text-gray-500 mb-4">Tarief: {formatCurrency(order.facturatie_code!.tarief)} per eenheid (excl. BTW)</p>

        <button type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-green-700">
          Factuur aanmaken
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 7: Create `src/app/(app)/facturen/page.tsx`**

```tsx
import Link from 'next/link'
import { getFacturen } from '@/lib/db/facturen'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'

const statusLabel: Record<string, string> = {
  concept: 'Concept',
  verzonden: 'Verzonden',
  betaald: 'Betaald',
}

export default async function FacturenPage() {
  const facturen = await getFacturen()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Facturen</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Factuurnummer</th>
            <th className="text-left py-2 font-medium text-gray-600">Klant</th>
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
            <th className="text-left py-2 font-medium text-gray-600">Status</th>
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
          </tr>
        </thead>
        <tbody>
          {facturen.map(f => (
            <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/facturen/${f.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {f.factuur_nummer}
                </Link>
              </td>
              <td className="py-2">{(f.order as any)?.klant?.naam}</td>
              <td className="py-2 font-mono text-xs text-gray-500">{(f.order as any)?.order_nummer}</td>
              <td className="py-2 text-right">{formatCurrency(f.totaal_bedrag)}</td>
              <td className="py-2">{statusLabel[f.status]}</td>
              <td className="py-2 text-gray-500">{formatDate(f.factuurdatum)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 8: Create `src/app/(app)/facturen/[id]/page.tsx`**

```tsx
import { getFactuur, updateFactuurStatus } from '@/lib/db/facturen'
import { getLeveringen } from '@/lib/db/leveringen'
import { FactuurPrintKnop } from '@/components/facturen/FactuurPrintKnop'
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
  const leveringen = await getLeveringen(factuur.order_id).then(all =>
    all.filter(l => l.factuur_id === id)
  )
  const klantNaam = (factuur.order as any)?.klant?.naam ?? '–'

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
          <p className="text-gray-500 text-sm">{klantNaam} · {statusLabel[factuur.status]}</p>
        </div>
        <FactuurPrintKnop factuur={factuur} leveringen={leveringen} klantNaam={klantNaam} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">Factuurdatum:</span> <strong>{formatDate(factuur.factuurdatum)}</strong></div>
        <div><span className="text-gray-500">Order:</span> <strong className="font-mono text-xs">{(factuur.order as any)?.order_nummer}</strong></div>
        <div><span className="text-gray-500">Totaal eenheden:</span> <strong>{formatAantal(factuur.totaal_eenheden)}</strong></div>
        <div><span className="text-gray-500">Tarief:</span> <strong>{formatCurrency(factuur.tarief)} / eenheid</strong></div>
        <div className="col-span-2 pt-2 border-t border-gray-100">
          <span className="text-gray-500">Totaalbedrag excl. BTW:</span>{' '}
          <strong className="text-lg">{formatCurrency(factuur.totaal_bedrag)}</strong>
        </div>
      </div>

      <h2 className="font-semibold mb-3">Leveringen in deze factuur</h2>
      <table className="w-full text-sm mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
            <th className="text-right py-2 font-medium text-gray-600">Eenheden</th>
            <th className="text-right py-2 font-medium text-gray-600">Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {leveringen.map(l => (
            <tr key={l.id} className="border-b border-gray-100">
              <td className="py-2">{formatDate(l.leverdatum)}</td>
              <td className="py-2 text-right">{formatAantal(l.aantal_geleverd)}</td>
              <td className="py-2 text-right">{formatCurrency(factuur.tarief * l.aantal_geleverd)}</td>
            </tr>
          ))}
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

- [ ] **Step 9: Create `src/components/facturen/FactuurPrintKnop.tsx`**

```tsx
'use client'

import dynamic from 'next/dynamic'
import type { Factuur, Levering } from '@/types'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false }
)

const FactuurDocument = dynamic(
  () => import('./FactuurDocument').then(m => m.FactuurDocument),
  { ssr: false }
)

interface Props {
  factuur: Factuur
  leveringen: Levering[]
  klantNaam: string
}

export function FactuurPrintKnop({ factuur, leveringen, klantNaam }: Props) {
  return (
    <PDFDownloadLink
      document={<FactuurDocument factuur={factuur} leveringen={leveringen} klantNaam={klantNaam} />}
      fileName={`factuur-${factuur.factuur_nummer}.pdf`}
      className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 inline-block"
    >
      {({ loading }) => loading ? 'PDF laden...' : 'Download PDF'}
    </PDFDownloadLink>
  )
}
```

- [ ] **Step 10: Verify invoice creation and PDF download work**

- Navigate to a fully-delivered order
- Click "Factuur aanmaken"
- Verify correct leveringen are shown
- Create invoice → verify factuur_nummer is generated
- Verify PDF download works

- [ ] **Step 11: Commit**

```bash
git add src/
git commit -m "feat: add facturen creation, list, and PDF download"
```

---

## Task 12: Voorraad (Stock Overview)

**Files:**
- Create: `src/lib/db/voorraad.ts`
- Create: `src/components/voorraad/VoorraadDocument.tsx`
- Create: `src/app/(app)/voorraad/page.tsx`

- [ ] **Step 1: Write failing test**

Create `src/lib/db/voorraad.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { groepeerdOpKlant } from './voorraad'
import type { VoorraadRegel } from '@/types'

describe('groepeerdOpKlant', () => {
  const regels: VoorraadRegel[] = [
    { order_id: '1', order_nummer: 'A', klant_naam: 'Klant X', order_grootte: 100, totaal_geleverd: 40, resterend: 60 },
    { order_id: '2', order_nummer: 'B', klant_naam: 'Klant X', order_grootte: 50, totaal_geleverd: 50, resterend: 0 },
    { order_id: '3', order_nummer: 'C', klant_naam: 'Klant Y', order_grootte: 200, totaal_geleverd: 100, resterend: 100 },
  ]

  it('groups by klant_naam', () => {
    const groepen = groepeerdOpKlant(regels)
    expect(Object.keys(groepen)).toEqual(['Klant X', 'Klant Y'])
  })

  it('includes only orders with resterend > 0', () => {
    const groepen = groepeerdOpKlant(regels)
    expect(groepen['Klant X']).toHaveLength(1)
    expect(groepen['Klant X'][0].order_nummer).toBe('A')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/db/voorraad.test.ts
```

- [ ] **Step 3: Create `src/lib/db/voorraad.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import type { VoorraadRegel } from '@/types'

export function groepeerdOpKlant(regels: VoorraadRegel[]): Record<string, VoorraadRegel[]> {
  const actief = regels.filter(r => r.resterend > 0)
  return actief.reduce((acc, regel) => {
    if (!acc[regel.klant_naam]) acc[regel.klant_naam] = []
    acc[regel.klant_naam].push(regel)
    return acc
  }, {} as Record<string, VoorraadRegel[]>)
}

export async function getVoorraad(): Promise<VoorraadRegel[]> {
  const supabase = await createClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_nummer,
      order_grootte,
      klant:klanten(naam),
      leveringen(aantal_geleverd)
    `)
    .not('status', 'eq', 'gefactureerd')

  if (error) throw error

  return (orders ?? []).map(order => {
    const totaalGeleverd = (order.leveringen ?? []).reduce(
      (sum: number, l: { aantal_geleverd: number }) => sum + l.aantal_geleverd, 0
    )
    return {
      order_id: order.id,
      order_nummer: order.order_nummer,
      klant_naam: (order.klant as any)?.naam ?? '–',
      order_grootte: order.order_grootte,
      totaal_geleverd: totaalGeleverd,
      resterend: Math.max(0, order.order_grootte - totaalGeleverd),
    }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/lib/db/voorraad.test.ts
```

- [ ] **Step 5: Create `src/components/voorraad/VoorraadDocument.tsx`**

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { VoorraadRegel } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 20 },
  row: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  header: { fontFamily: 'Helvetica-Bold' },
})

interface Props {
  klantNaam: string
  regels: VoorraadRegel[]
  datum: string
}

export function VoorraadDocument({ klantNaam, regels, datum }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Voorraadoverzicht – {klantNaam}</Text>
        <Text style={styles.subtitle}>Per {datum}</Text>
        <View style={{ ...styles.row }}>
          <Text style={{ ...styles.header, flex: 2 }}>Order</Text>
          <Text style={{ ...styles.header, flex: 1, textAlign: 'right' }}>Totaal</Text>
          <Text style={{ ...styles.header, flex: 1, textAlign: 'right' }}>Geleverd</Text>
          <Text style={{ ...styles.header, flex: 1, textAlign: 'right' }}>Resterend</Text>
        </View>
        {regels.map(r => (
          <View key={r.order_id} style={styles.row}>
            <Text style={{ flex: 2 }}>{r.order_nummer}</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>{r.order_grootte.toLocaleString('nl-NL')}</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>{r.totaal_geleverd.toLocaleString('nl-NL')}</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>{r.resterend.toLocaleString('nl-NL')}</Text>
          </View>
        ))}
      </Page>
    </Document>
  )
}
```

- [ ] **Step 6: Create `src/app/(app)/voorraad/page.tsx`**

```tsx
import { getVoorraad, groepeerdOpKlant } from '@/lib/db/voorraad'
import { formatAantal } from '@/lib/utils/formatters'
import { VoorraadExportKnop } from '@/components/voorraad/VoorraadExportKnop'

export default async function VoorraadPage() {
  const regels = await getVoorraad()
  const groepen = groepeerdOpKlant(regels)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Voorraad</h1>

      {Object.keys(groepen).length === 0 && (
        <p className="text-gray-500 text-sm">Geen actieve voorraad.</p>
      )}

      {Object.entries(groepen).map(([klantNaam, klantRegels]) => (
        <div key={klantNaam} className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">{klantNaam}</h2>
            <VoorraadExportKnop klantNaam={klantNaam} regels={klantRegels} />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">Order</th>
                <th className="text-right py-2 font-medium text-gray-600">Totaal</th>
                <th className="text-right py-2 font-medium text-gray-600">Geleverd</th>
                <th className="text-right py-2 font-medium text-gray-600">Resterend</th>
              </tr>
            </thead>
            <tbody>
              {klantRegels.map(r => (
                <tr key={r.order_id} className="border-b border-gray-100">
                  <td className="py-2 font-mono text-xs">{r.order_nummer}</td>
                  <td className="py-2 text-right">{formatAantal(r.order_grootte)}</td>
                  <td className="py-2 text-right">{formatAantal(r.totaal_geleverd)}</td>
                  <td className="py-2 text-right font-semibold">{formatAantal(r.resterend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
```

Create `src/components/voorraad/VoorraadExportKnop.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import type { VoorraadRegel } from '@/types'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false }
)

const VoorraadDocument = dynamic(
  () => import('./VoorraadDocument').then(m => m.VoorraadDocument),
  { ssr: false }
)

interface Props {
  klantNaam: string
  regels: VoorraadRegel[]
}

export function VoorraadExportKnop({ klantNaam, regels }: Props) {
  const datum = new Date().toLocaleDateString('nl-NL')
  return (
    <PDFDownloadLink
      document={<VoorraadDocument klantNaam={klantNaam} regels={regels} datum={datum} />}
      fileName={`voorraad-${klantNaam.replace(/\s+/g, '-').toLowerCase()}.pdf`}
      className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 inline-block"
    >
      {({ loading }) => loading ? 'PDF laden...' : 'Export PDF'}
    </PDFDownloadLink>
  )
}
```

- [ ] **Step 7: Verify stock overview**

Open `/voorraad`. Verify orders with remaining stock appear grouped by customer. Verify PDF export button works.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add voorraad (stock) overview with per-customer PDF export"
```

---

## Task 13: Dashboard

**Files:**
- Modify: `src/app/(app)/page.tsx`

- [ ] **Step 1: Update dashboard page**

```tsx
import Link from 'next/link'
import { getOrders } from '@/lib/db/orders'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

export default async function DashboardPage() {
  const { orders } = await getOrders(1, 20)
  const actief = orders.filter(o => o.status !== 'gefactureerd')
  const teFactureren = orders.filter(o => o.status === 'geleverd')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {teFactureren.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm font-semibold text-yellow-800 mb-2">
            {teFactureren.length} order{teFactureren.length > 1 ? 's' : ''} wacht{teFactureren.length === 1 ? '' : 'en'} op facturatie
          </p>
          {teFactureren.map(o => (
            <Link key={o.id} href={`/orders/${o.id}`}
              className="text-sm text-yellow-700 hover:underline block">
              {o.order_nummer} – {o.klant?.naam}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Actieve orders</h2>
        <Link href="/orders/nieuw"
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700">
          + Nieuwe order
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 font-medium text-gray-600">Order</th>
            <th className="text-left py-2 font-medium text-gray-600">Klant</th>
            <th className="text-right py-2 font-medium text-gray-600">Grootte</th>
            <th className="text-left py-2 font-medium text-gray-600">Status</th>
            <th className="text-left py-2 font-medium text-gray-600">Datum</th>
          </tr>
        </thead>
        <tbody>
          {actief.map(order => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <Link href={`/orders/${order.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {order.order_nummer}
                </Link>
              </td>
              <td className="py-2">{order.klant?.naam}</td>
              <td className="py-2 text-right">{formatAantal(order.order_grootte)}</td>
              <td className="py-2"><StatusBadge status={order.status} /></td>
              <td className="py-2 text-gray-500">{formatDate(order.aangemaakt_op.split('T')[0])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify dashboard shows active orders and invoicing alerts**

- [ ] **Step 3: Run all tests**

```bash
npm run test:run
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/page.tsx
git commit -m "feat: complete dashboard with active orders and invoicing alerts"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: No TypeScript errors, successful build.

- [ ] **Step 3: End-to-end smoke test**

Walk through the full workflow manually:
1. Login
2. Create a klant
3. Create a facturatie code
4. Create an order
5. Advance status to `in_behandeling`
6. Register two partial deliveries
7. Verify stock on `/voorraad`
8. Create a factuur for one delivery
9. Create a second factuur for the remaining delivery
10. Verify order status is now `gefactureerd`
11. Download PDF for both facturen
12. Export voorraad PDF for the klant
13. Verify dashboard shows correct state throughout

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete order management web app"
```
