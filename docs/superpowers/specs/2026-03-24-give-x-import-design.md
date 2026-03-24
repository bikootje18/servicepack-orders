# Give-X Excel Import — Design Spec

**Datum:** 2026-03-24
**Status:** Goedgekeurd

## Samenvatting

Give-X stuurt wekelijks 30-50 Excel bestanden met productie-orders. Het systeem moet deze bestanden kunnen importeren, matchen aan bestaande orders, en ongematchte imports bewaren voor handmatige afhandeling. Dit feature wordt gehuisvest in een nieuwe klant-detailpagina, als onderdeel van een bredere verschuiving waarbij "Facturen" uit de navigatie verdwijnt en "Klanten" de plek wordt voor klant-specifieke processen.

## Scope

1. Facturen verwijderen uit de navigatie
2. Klanten detailpagina's aanmaken (`/klanten/[id]`)
3. Give-X imports sectie op de klantpagina
4. Import parser + Server Action voor bulk upload
5. Database migratie voor `give_x_imports` tabel

## Bestandsstructuur van Give-X

Twee varianten, beide semicolon-separated:

**Variant zonder rollen** (`GIV00A-A`):
```
Documentnummer;Artikelnummer;Klant artikelnummer;Omschrijving op barcode;Barcode;Hoeveelheid;Levering OCC;T.b.v. Order;Instructie;Geprod. SP
20260326-GIV00A-A;496011059;;Omschrijving;8718917669761;60;26-3-2026;order_55977_GBC;GIV00A-A;
...
;;;;;;990;;;;
```

**Variant met rollen** (`GIV0RL-A`):
```
Documentnummer;Artikelnummer;Omschrijving op barcode;Barcode;Hoeveelheid;Rollen;Levering OCC;T.b.v. Order;Instructie;Geprod. SP
20260326-GIV0RL-A;318610059;Omschrijving;8718917603703;2000;10;26-3-2026;order_56106_Grand Ca;GIV0RL-A;
...
;;;;;2000;10;;;;
```

Kenmerken:
- Rij 0 = kolomkoppen
- Rijen 1..n = productieregels
- Laatste twee rijen: lege rij + somregel (alleen Hoeveelheid en eventueel Rollen gevuld)
- Documentnummer = `YYYYMMDD-GIV{code}-{batch}` (bijv. `20260326-GIV00A-A`)
- Instructie kolom = `GIV{code}-{batch}` (bijv. `GIV00A-A`)

## Code extractie

De `order_code` voor matching wordt afgeleid van de `Instructie` kolom:

```
GIV00A-A  →  GIV00AA   (streepje verwijderd)
GIV0RL-A  →  GIV0RLA
```

Dit wordt vergeleken met het `order_code` veld in de `orders` tabel.

## Navigatie & routing

- Facturen verdwijnt uit de navigatie
- `/klanten` — lijst van klanten, elke rij klikbaar
- `/klanten/[id]` — klant detailpagina met:
  - Basisinfo (naam, adres)
  - Processen-secties per klant (Give-X: Imports sectie)

## Import flow

1. Gebruiker opent de Give-X klantpagina
2. Dropzone accepteert 30-50 xlsx/csv bestanden tegelijk
3. Browser stuurt bestanden via `FormData` naar een Server Action
4. Server verwerkt elk bestand:
   a. Parsen: kolommen detecteren (met/zonder Rollen), instructie_code extraheren, somregel lezen
   b. Matchen: zoek order met `order_code = instructie_code`
   c. Opslaan in `give_x_imports`
5. Server retourneert array met resultaten
6. UI toont direct: ✓ gematchte orders | ✗ niet-gevonden codes

## Ongematchte imports

- Worden opgeslagen met `order_id = null`
- Zichtbaar op de Give-X klantpagina als "Nog te koppelen"
- Wanneer een order handmatig wordt aangemaakt, kan de koppeling gelegd worden

## Datamodel

### Nieuwe tabel: `give_x_imports`

```sql
create table give_x_imports (
  id uuid primary key default gen_random_uuid(),
  klant_id uuid not null references klanten(id),
  documentnummer text not null,
  instructie_code text not null,
  leverdatum date,
  totaal_hoeveelheid int not null,
  heeft_rollen boolean not null default false,
  order_id uuid references orders(id),
  aangemaakt_op timestamptz not null default now()
);
```

## Technische aanpak

- **Parser**: Server Action in Next.js, geen externe service
- **xlsx parsing**: `xlsx` npm package (werkt server-side in Node.js)
- **Upload**: browser stuurt `FormData` met meerdere bestanden, server verwerkt sequentieel
- **Bestandsformaten**: xlsx én csv worden ondersteund (Give-X levert xlsx, maar csv werkt ook)

## Niet in scope (voor later)

- Orders uitprinten (print-layout TBD)
- Automatisch orders aanmaken vanuit ongematchte imports
- Processen voor andere klanten dan Give-X
