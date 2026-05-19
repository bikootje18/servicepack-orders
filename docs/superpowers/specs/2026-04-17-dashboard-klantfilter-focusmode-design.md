---
name: Dashboard klantfilter en focus mode
description: Klantfilter (combobox) en locatiekolom focus mode op het bestaande productiedashboard
type: spec
date: 2026-04-17
---

# Dashboard: klantfilter + focus mode

## Doel

Het productiedashboard schaalt niet bij honderd+ orders per dag. Twee verbeteringen:
1. Filter op klant via een searchable dropdown (combobox)
2. Focus mode: één locatiekolom op volledig scherm

---

## Feature 1: Klantfilter

### Werking

- URL-gebaseerd: `?klant=[klantId]`
- Zonder parameter = alle klanten (huidige gedrag)
- De dashboardpagina leest `searchParams.klant` en geeft dit door aan de data-fetchfuncties

### UI

- Bovenaan het dashboard, naast de bestaande titel/datum, een combobox
- Combobox: typ om te filteren op naam, selecteer een klant → navigeert naar `?klant=[id]`
- "Alle klanten" optie om het filter te wissen
- ~200 klanten → client-side filtering op reeds geladen lijst (geen extra API calls)
- Ontwerp via `frontend-design` skill voor een polished combobox

### Data

- `getOrdersPerLocatie(klantId?: string)` — filtert orders op `klant_id` als opgegeven
- `getOrdersOverigeLocaties(klantId?: string)` — zelfde
- `getVrachtenPerLocatie` — vrachten worden niet gefilterd op klant (vrachten zijn al per locatie, klantfilter op vrachten is buiten scope)
- Alle klanten ophalen voor de combobox: bestaande `getKlanten()` hergebruiken

### Server component aanpak

`DashboardPage` wordt uitgebreid met `searchParams`:
```ts
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ klant?: string }> })
```
De klantId wordt doorgegeven aan de data-fetchfuncties. De combobox wordt een client component (`'use client'`) die `useRouter` + `router.push` gebruikt voor navigatie.

---

## Feature 2: Focus mode

### Werking

- Klik op de header van een locatiekolom → die kolom neemt volledige schermbreedte in, de rest verdwijnt
- Klik nogmaals op de header (of een sluitknop) → terug naar normaal overzicht
- Puur client-side state, geen URL, geen herlaad van data

### UI

- Wrapper component `DashboardGrid` (`'use client'`) houdt bij welke kolom gefocust is (`focusLocatie: string | null`)
- In focus mode: grid wordt 1 kolom, de gefocuste `LocatieKolom` krijgt meer ruimte
- Header van de kolom krijgt een visuele hint dat hij klikbaar is (cursor pointer, subtiele hover state)
- Sluitknop of "terug" indicator in focus mode
- Ontwerp via `frontend-design` skill voor een vloeiende overgang

### Componentstructuur

```
DashboardPage (server)
  └── DashboardGrid (client) ← nieuw, beheert focusLocatie state + rendert kolommen
        ├── KlantCombobox (client) ← nieuw
        └── LocatieKolom (wordt client component)
```

`DashboardPage` (server) fetcht alle data en geeft deze als serialiseerbare props door aan `DashboardGrid`. `DashboardGrid` is een client component die de focus state beheert en de kolommen rendert. `LocatieKolom` wordt omgezet naar een client component (het doet geen async data fetching, het is puur presentationeel) en ontvangt een `onClick` prop voor de focus actie.

---

## Buiten scope

- Vrachten filteren op klant
- Focus mode URL-gebaseerd/bookmarkbaar
- Meerdere klanten tegelijk selecteren
