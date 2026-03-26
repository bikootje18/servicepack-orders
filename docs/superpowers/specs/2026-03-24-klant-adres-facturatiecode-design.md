# Design: Klant adres + Facturatie code vrij typen

**Datum:** 2026-03-24

## Doel

1. Klanten krijgen adresvelden zodat de CMR vrachtbrief automatisch het afleveradres toont
2. Facturatie code wordt vrij in te typen (met autocomplete) in plaats van een dropdown

---

## Feature 1: Klant adres

### Data

Vier nieuwe kolommen op `klanten` (allemaal `text NOT NULL DEFAULT ''` — bestaande klanten breken niet):
- `adres` — straat + huisnummer
- `postcode`
- `stad`
- `land`

### UI — Klantenpagina

Formulier uitgebreid met vier extra velden. Lijst toont adres als tweede regel onder de naam.

### Vrachtbrief PDF

Vak 2 (Ontvanger) toont nu: naam, adres, postcode + stad, land — in plaats van `[Adres invullen]`.

---

## Feature 2: Facturatie code vrij typen

### Aanpak

Geen schema-wijziging nodig. `facturatie_code_id` FK blijft op `orders`.

Formulierwijziging:
- `<select>` vervangen door `<input type="text" list="codes-list">` + `<datalist>` met alle actieve codes
- Server action zoekt de getypte code op in de `facturatie_codes` tabel → haalt `id` op
- Als code niet bestaat → validatiefout

Geldt voor zowel `orders/nieuw` als `orders/[id]/bewerken`.

---

## Geraakte bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/migrations/006_klant_adres.sql` | Nieuw — vier kolommen op klanten |
| `src/types/index.ts` | Klant type uitbreiden |
| `src/lib/db/klanten.ts` | createKlant/updateKlant accepteren adres |
| `src/app/(app)/klanten/page.tsx` | Formulier + lijst uitbreiden |
| `src/components/vrachten/VrachtbriefDocument.tsx` | Adres tonen in vak 2 |
| `src/app/(app)/orders/nieuw/page.tsx` | Select → datalist input, code lookup |
| `src/app/(app)/orders/[id]/bewerken/page.tsx` | Idem |
