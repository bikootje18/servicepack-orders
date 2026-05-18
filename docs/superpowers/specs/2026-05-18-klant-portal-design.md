# Klant Portal — Design Spec

**Date:** 2026-05-18  
**Status:** Approved

## Goal

Give customers (klanten) a restricted, read-only view of their own orders and deliveries at the facility. Customers log in with email + password and can only see their own data — not other customers' data, and not internal fields like locatie or facturatie_code.

## Architecture

The portal is a new `(portal)` route group inside the existing Next.js app, isolated enough to be extracted to a separate app in the future.

```
src/app/
  (app)/              ← existing staff app (unchanged)
  (auth)/             ← existing staff login (unchanged)
  (portal)/
    layout.tsx        ← minimal portal shell (logo, klant name, logout)
    login/
      page.tsx        ← customer login page
    dashboard/
      page.tsx        ← customer order overview
```

All portal-specific logic is isolated:
- `src/lib/db/portal.ts` — DB queries for the portal (not mixed into orders.ts)
- `src/lib/actions/portal.ts` — server actions for invite and revoke
- `src/components/portal/` — UI components for the portal

## Data Model

One new column on `klanten`:

```sql
ALTER TABLE klanten
ADD COLUMN portal_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
```

This is the only bridge between a Supabase auth account and a klant record. No new tables.

### RLS Policies

Two new policies so customers can only read their own data:

```sql
-- Orders: klant ziet alleen eigen orders
CREATE POLICY "klant ziet eigen orders" ON orders
  FOR SELECT TO authenticated
  USING (
    klant_id = (SELECT id FROM klanten WHERE portal_user_id = auth.uid())
  );

-- Leveringen: klant ziet alleen leveringen van eigen orders
CREATE POLICY "klant ziet eigen leveringen" ON leveringen
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE klant_id = (SELECT id FROM klanten WHERE portal_user_id = auth.uid())
    )
  );
```

## Authentication

Customers use Supabase email + password auth — the same Supabase project, but a separate auth user type distinguished by the `portal_user_id` link in `klanten`.

### Middleware

The existing middleware is extended with one check:

- If the request path starts with `/portal` and the user is not authenticated → redirect to `/portal/login`
- If the request path starts with `/portal` and the user is authenticated but has no matching row in `klanten.portal_user_id` (i.e. they are staff) → redirect to `/dashboard`
- Staff paths (`/dashboard`, `/orders`, etc.) remain unchanged; a klant user trying to access them gets redirected to `/portal/dashboard`

## Staff Invite Flow

On the existing `/klanten/[id]` page, a new section appears:

- **No portal account yet:** shows a "Stuur uitnodiging" button
- **Invite pending/active:** shows "Uitnodiging verstuurd" badge with the linked email, plus a "Toegang intrekken" button

### Invite server action (`src/lib/actions/portal.ts`)

1. Call `supabase.auth.admin.inviteUserByEmail(klant.email)` using the Supabase service role client
2. On success, write the returned user UUID to `klanten.portal_user_id`
3. Supabase sends the customer a "set your password" email automatically

### Revoke server action

1. Delete the Supabase auth user via `supabase.auth.admin.deleteUser(portal_user_id)`
2. Set `klanten.portal_user_id = null`

## Customer Dashboard (`/portal/dashboard`)

A read-only overview of all the customer's orders.

### Order list

Each order shows:

| Field | Label |
|---|---|
| order_nummer | Ordernummer |
| order_code | Code |
| status | Status (Dutch label: Concept / Bevestigd / In behandeling / Geleverd / Gefactureerd) |
| order_grootte | Grootte |
| deadline | Deadline |
| tht | THT |
| pallet_type | Pallettype |
| aantal_per_doos | Aantal/doos |
| aantal_per_inner | Aantal/inner |
| aantal_per_pallet | Aantal/pallet |

**Explicitly hidden:** `locatie`, `facturatie_code_id`, and all internal metadata.

### Leveringen (expandable per order)

Each order row is expandable. The expanded view shows the linked leveringen:

- Datum
- Hoeveelheid
- Notities (if any)

No editing anywhere — the portal is fully read-only.

### Portal layout

Minimal shell: company name/logo at the top, the logged-in customer's naam, and a logout button. No staff navigation links.

## Future Extraction to Separate App

The portal is designed to be self-contained. To extract it later:
- Move `src/app/(portal)/` to a new Next.js app
- Move `src/lib/db/portal.ts`, `src/lib/actions/portal.ts`, `src/components/portal/` with it
- Point to the same Supabase project
- Remove the portal route group and middleware rules from the main app

No shared code outside these directories is required for the portal to function.
