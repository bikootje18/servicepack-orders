# UI Polish — Design Spec
**Date:** 2026-03-23
**Scope:** Visual consistency and clarity improvements across the app

---

## Problem

The UI has three inconsistent accent colors (amber CSS var, blue buttons, purple nav indicator), browser-native form inputs with no focus states, and the Voorraad page presents stock data as raw numbers when ratios would be scannable at a glance. Typography is functional but undifferentiated.

---

## Changes

### 1. Unified accent color

- CSS `--accent` variable changes from `#F59E0B` (amber, unused) to `#7C3AED` (purple — already used in the nav active dot).
- All `bg-blue-600 hover:bg-blue-700` button instances replaced with purple equivalent (`bg-[#7C3AED] hover:bg-[#6D28D9]`).
- All `focus:ring-blue-500` / `focus:ring-2` instances replaced with purple ring.
- Anchor/cancel buttons (`border-gray-300`) stay neutral — no color change needed.

**Files with blue buttons:** `orders/nieuw`, `orders/[id]/bewerken`, `vrachten/nieuw`, `vrachten/page`, `orders/page`, `klanten/page`, `codes/page`, `page` (dashboard), `LeveringForm`, `FactuurPrintKnop`, `VrachtFactuurKnop`, `login/page`.

### 2. Styled form inputs

Define `@layer components` utilities in `globals.css`:

```
.form-input, .form-select, .form-textarea
  border: 1px solid #D1D5DB (gray-300)
  rounded-md (6px)
  px-3 py-2 text-sm bg-white
  hover: border-gray-400
  focus: outline-none, border-[#7C3AED], ring-3 ring-[#7C3AED]/10
  transition: border-color 150ms, box-shadow 150ms

.form-checkbox
  accent-color: #7C3AED
  w-4 h-4
```

Replace all raw `border border-gray-300 rounded px-3 py-2 text-sm` in inputs/selects/textareas with `.form-input` / `.form-select` / `.form-textarea`.

**Files with raw inputs:** `orders/nieuw`, `orders/[id]/bewerken`, `vrachten/nieuw`, `codes/page`, `klanten/page`, `LeveringForm`, `login/page`.

### 3. Heading typography

Add **Syne** (Google Font, weight 600–700) as a display font alongside DM Sans.

- Load in `layout.tsx` via `next/font/google`.
- Apply via CSS variable `--font-display`.
- In `globals.css`: `h1, h2 { font-family: var(--font-display); letter-spacing: -0.02em; }`
- No size changes — just font family swap for headings.

### 4. Voorraad progress bars

In each table row on `voorraad/page.tsx`, add a thin visual bar in the `Resterend` column showing the remaining proportion of the total order.

- Bar width = `(resterend / order_grootte) * 100%`
- Thin bar (3px height), rounded, purple fill on gray track
- Sits below the number in the Resterend cell
- Empty state (resterend = 0): bar is fully gray

No new data fetching needed — `r.resterend` and `r.order_grootte` are already available.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/globals.css` | CSS variable update, `.form-input/.form-select/.form-textarea/.form-checkbox` utilities, `h1/h2` font rule |
| `src/app/layout.tsx` | Add Syne font import |
| `src/app/(app)/orders/nieuw/page.tsx` | `.form-input/.form-select`, purple button |
| `src/app/(app)/orders/[id]/bewerken/page.tsx` | `.form-input/.form-select`, purple button |
| `src/app/(app)/vrachten/nieuw/page.tsx` | `.form-input`, purple button |
| `src/app/(app)/vrachten/page.tsx` | Purple button |
| `src/app/(app)/orders/page.tsx` | Purple button |
| `src/app/(app)/klanten/page.tsx` | `.form-input`, purple button |
| `src/app/(app)/codes/page.tsx` | `.form-input`, purple button |
| `src/app/(app)/page.tsx` | Purple button |
| `src/app/(app)/voorraad/page.tsx` | Progress bars in Resterend column |
| `src/app/(auth)/login/page.tsx` | `.form-input`, purple button |
| `src/components/leveringen/LeveringForm.tsx` | `.form-input`, purple button |
| `src/components/facturen/FactuurPrintKnop.tsx` | Purple button |
| `src/components/vrachten/VrachtFactuurKnop.tsx` | Purple button |

---

## Out of Scope

- No layout or structural changes
- No changes to PDF documents
- No changes to the sidebar or NavLink (already uses purple correctly)
- No changes to KlaarDownloadKnoppen (already uses purple hover states)
- No data model changes
