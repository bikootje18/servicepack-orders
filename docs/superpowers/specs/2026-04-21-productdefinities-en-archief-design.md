# Productdefinities Lookup & Order Archief

**Datum:** 2026-04-21

## Samenvatting

Twee features die samen het orderbeheer verbeteren:

1. **Productdefinities-tabel** in Supabase met import van de Excel, plus een slim zoekveld in het orderformulier dat velden automatisch invult
2. **Order archief** — orders met een gekoppelde vracht verdwijnen uit het actieve overzicht

---

## Feature 1: Productdefinities

### Database

Nieuwe tabel `productdefinities` met de kolommen uit de Excel:

| Kolom | Type | Beschrijving |
|---|---|---|
| `id` | uuid, PK | |
| `publiceren` | boolean | Of het artikel gepubliceerd is |
| `art_nr` | text, UNIQUE | Artikelcode (= order_code) |
| `omschrijving_eindproduct` | text | Bijv. "Gouden Carolus Classic 8x33 cl" |
| `art_grondstof` | text | Artikelcode grondstof |
| `omschrijving_grondstof` | text | Beschrijving grondstof |
| `grondstof_per_he` | numeric(10,6) | Verhouding grondstof/HE |
| `tray_1_code` | text | Artikelcode tray 1 |
| `tray_1_per_he` | integer | Aantal tray 1 per HE |
| `tray_1_omschrijving` | text | Bijv. "tray wit 245x125x38mm" |
| `tray_2_code` | text | Artikelcode tray 2 |
| `tray_2_per_he` | integer | Aantal tray 2 per HE |
| `tray_2_omschrijving` | text | Beschrijving tray 2 |
| `ean_he` | text | EAN code HE (EAN-14) |
| `label_1_per_he` | integer | Aantal label 1 per HE |
| `ean_ce` | text | EAN code CE (EAN-13) |
| `label_2_per_he` | integer | Aantal label 2 per HE |
| `per_laag` | integer | Stuks per laag op pallet |
| `lagen` | integer | Aantal lagen op pallet |
| `per_pallet` | integer | Totaal per pallet (= per_laag x lagen) |
| `lading_drager` | text | DPB, CHEP100, CHEP80, EURO, DOLLY |
| `tussenlegvel` | boolean | Tussenlegvel ja/nee |
| `hoekprofiel` | boolean | Hoekprofiel ja/nee |
| `spiegelen` | boolean | Spiegelen ja/nee |
| `tarief_service_pack` | numeric(10,5) | Tarief |
| `aangemaakt_op` | timestamptz | Default now() |

### Import script

Een eenmalig Node.js script (`scripts/import-productdefinities.ts`) dat:
1. De Excel leest met `xlsx` package
2. Kolommen mapt naar de databasevelden
3. Upsert in Supabase (op `art_nr`) zodat het herhaalbaar is bij nieuwe Excel-versies

### Mapping lading_drager → pallet_type

| Excel waarde | Order pallet_type |
|---|---|
| CHEP100, CHEP80 | `chep` |
| EURO | `euro` |
| DPB | `geen` |
| DOLLY | `geen` |

### Lookup in het orderformulier

Het `order_code` veld in `OrderFormulier.tsx` wordt een zoekveld:

1. Gebruiker begint te typen in het order_code veld
2. Na 2+ karakters: server action zoekt in `productdefinities` op `art_nr` of `omschrijving_eindproduct` (ilike)
3. Dropdown toont max 8 matches: `"200281 — De Koninck Bolleke 8x33 cl"`
4. Bij selectie worden velden ingevuld:
   - `order_code` ← `art_nr`
   - `omschrijving` ← `"{art_nr} {omschrijving_eindproduct}\nPer {per_laag}x{lagen} = {per_pallet} EAN = {ean_he}"`
   - `aantal_per_pallet` ← `per_pallet`
   - `pallet_type` ← mapping van `lading_drager`
   - `aantal_per_doos` ← niet automatisch ingevuld (niet betrouwbaar af te leiden), gebruiker vult dit handmatig in
5. Artikelen (trays) worden automatisch voorgevuld als tray_1 of tray_2 aanwezig zijn:
   - Naam: `"BSB{tray_1_code} {tray_1_omschrijving}"`
   - Factor: `tray_1_per_he`, berekening_type: `vermenigvuldigen`

### API

Nieuwe server-side functie in `src/lib/db/productdefinities.ts`:

```typescript
export async function zoekProductdefinities(zoekterm: string): Promise<Productdefinitie[]>
```

Nieuwe server action in `src/lib/actions/productdefinities.ts` die vanuit de client aangeroepen wordt voor de autocomplete.

---

## Feature 2: Order Archief

### Logica

Een order is "gearchiveerd" als er minstens 1 vracht aan gekoppeld is (via leveringen → vracht_regels → vrachten).

### Orders-pagina

De orders-pagina krijgt twee tabs bovenaan: **Actief** | **Archief**

- **Actief** (standaard): toont orders die GEEN gekoppelde vracht hebben
- **Archief**: toont orders die WEL een gekoppelde vracht hebben

### Implementatie

Geen nieuwe kolom nodig. De query filtert via een subquery:

- Actief: orders waarvan GEEN levering voorkomt in `vracht_regels`
- Archief: orders waarvan WEL een levering voorkomt in `vracht_regels`

Dit wordt geïmplementeerd als een `archief` query parameter op de orders-pagina, en een aangepaste `getOrders()` functie die dit filter toepast.

---

## Scope

### Wel
- Productdefinities tabel + migratie
- Import script voor de Excel
- Autocomplete lookup in het orderformulier
- Archief filter op orders-pagina

### Niet
- Bewerken van productdefinities in de UI (later eventueel)
- Aparte productdefinities-pagina (later eventueel)
- Automatische herberekening bij wijziging productdefinitie
