# Klant Detail Pagina — Orders Overzicht & Bewerken

**Datum:** 2026-03-26
**Status:** Goedgekeurd

## Samenvatting

De klant detailpagina (`/klanten/[id]`) wordt uitgebreid met twee functies: klantgegevens bewerken via een formulier, en een orders-overzicht gegroepeerd op productiestatus en vrachtsstatus.

## Scope

1. Klantinfo sectie met "Bewerken" knop en formulier
2. Orders overzicht in drie groepen (Lopend, Vracht klaar, Opgehaald)
3. DB query: orders per klant inclusief vrachtstatus via leveringen

## Paginastructuur

De pagina heeft drie secties van boven naar beneden:

1. **Klantinfo** — naam + adres, met "Bewerken" knop
2. **Orders** — drie gestapelde blokken per statusgroep
3. **Imports** — bestaande Give-X sectie (ongewijzigd)

## Klant bewerken

Een "Bewerken" knop onthult een formulier met de velden: naam, adres, postcode, stad, land. Opslaan via een Server Action die de bestaande `updateKlant` functie aanroept (`src/lib/db/klanten.ts`). Na opslaan sluit het formulier en wordt de pagina gerefresht via `revalidatePath`.

Het formulier wordt getoond/verborgen met een Client Component die de open/dicht staat bijhoudt.

## Orders groepering

### Query

Eén Supabase query haalt alle orders op voor de klant met joins:

```
orders
  → leveringen (order_id)
    → vracht_regels (levering_id)
      → vrachten (id, vrachtbrief_nummer, status)
```

### Groepen

| Groep | Conditie |
|-------|----------|
| **Lopend** | `order.status` in `concept`, `bevestigd`, `in_behandeling` |
| **Vracht klaar** | `order.status = geleverd` én minstens één vracht met `status = aangemaakt` |
| **Opgehaald** | `order.status = geleverd` én alle gekoppelde vrachten hebben `status = opgehaald` |

Orders met `status = geleverd` maar zonder gekoppelde vrachten vallen onder **Lopend** (levering geregistreerd maar nog niet ingepland voor transport).

Orders met `status = gefactureerd` worden behandeld als **Opgehaald** — ze zijn volledig afgerond.

### Per order getoond

- Ordernummer (klikbaar → `/orders/[id]`)
- Order_code
- Order_grootte
- Deadline (indien aanwezig)
- Vrachtbrief-nummers van gekoppelde vrachten (indien aanwezig)

### Lege groepen

Groepen zonder orders worden niet getoond.

## Technische aanpak

- **Server component** — de pagina blijft een async server component
- **Client component voor bewerk-knop** — alleen het formulier-toggle is client-side (`'use client'`)
- **DB query** — nieuwe functie `getOrdersVoorKlant(klantId)` in `src/lib/db/orders.ts`
- **Groepering** — TypeScript logica in de server component, geen extra DB queries
- **Bewerken formulier** — inline Server Action in de page component, roept `updateKlant` aan uit `src/lib/db/klanten.ts`

## Niet in scope

- Sortering binnen groepen (op deadline, aanmaakdatum)
- Orders aanmaken vanuit de klantpagina
- Paginering van orders
