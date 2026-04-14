# Order splitsen

**Datum:** 2026-04-14  
**Status:** Goedgekeurd

## Probleem

Een order wordt soms op meerdere locaties uitgevoerd — de ene locatie doet een deel, een andere locatie doet de rest. Nu is er geen manier om dit netjes vast te leggen: er is maar één locatie per order. Het gevolg is dat het dashboard niet klopt en er verwarring ontstaat over wie wat maakt.

## Oplossing

Een "Splits order" functie op de orderdetailpagina. Het originele order behoudt zijn nummer maar krijgt een lager aantal. Het afgesplitste deel krijgt een nieuw ordernummer met een letter-suffix (A, B, C...) en een eigen locatie. Beide orders verwijzen naar elkaar via een klikbare link.

## Ontwerp

### Database

Twee nieuwe kolommen op de `orders` tabel:

- `gesplitst_van` — UUID, nullable, FK naar `orders.id` — verwijst naar het originele order
- `gesplitst_naar` — UUID, nullable, FK naar `orders.id` — verwijst naar het afgesplitste order

Eén-op-één relatie: een order kan maximaal één keer direct gesplitst worden (maar het afgesplitste order kan zelf ook weer gesplitst worden, wat 123456A → 123456B oplevert).

Migratie:
```sql
ALTER TABLE orders ADD COLUMN gesplitst_van uuid REFERENCES orders(id);
ALTER TABLE orders ADD COLUMN gesplitst_naar uuid REFERENCES orders(id);
```

### Ordernummer suffix

Het nieuwe ordernummer = `{origineel_nummer}A`. Als `{origineel_nummer}A` al bestaat: `{origineel_nummer}B`, enzovoort (A t/m Z). De check gebeurt in de server action vóór het aanmaken.

### Wat er gekopieerd wordt

Het afgesplitste order krijgt dezelfde waarden als het origineel voor:
- `klant_id`, `order_code`, `facturatie_code_id`
- `aantal_per_doos`, `aantal_per_inner`, `aantal_per_pallet`, `pallet_type`
- `bewerking`, `opwerken`, `bio`, `omschrijving`
- `deadline`, `tht`
- `aangemaakt_door`

Wat verschilt:
- `order_nummer` — nieuw nummer met suffix
- `order_grootte` — het afgesplitste aantal
- `locatie` — de nieuwe locatie (gekozen door gebruiker)
- `status` — altijd `in_behandeling` (zelfde als origineel op moment van split)

Het originele order:
- `order_grootte` wordt verlaagd met het afgesplitste aantal
- `gesplitst_naar` krijgt het ID van het nieuwe order

### Validaties

- Afsplitsen is alleen mogelijk als `resterend > 0` (resterend = order_grootte − totaal gereedgemeld)
- Het af te splitsen aantal moet `>= 1` en `<= resterend`
- De nieuwe locatie moet verschillen van de huidige locatie
- De nieuwe locatie moet een geldige waarde zijn uit `LOCATIES`

### Server action — `src/lib/actions/orders.ts`

Nieuwe functie `splitsOrder(id: string, formData: FormData)`:
1. Lees `aantal` en `locatie` uit formData
2. Valideer (zie boven)
3. Bepaal nieuw ordernummer (A t/m Z, check op bestaan)
4. Verlaag `order_grootte` van origineel, zet `gesplitst_naar`
5. Maak nieuw order aan met gekopieerde velden + `gesplitst_van`
6. `revalidatePath('/orders')`, `revalidatePath('/dashboard')`
7. Redirect naar detailpagina van het nieuwe order

### UI — orderdetailpagina

**Splits-knop:** Zichtbaar naast "Kloon deze order", alleen als `resterend > 0`. Label: "Splits order".

**Splits-formulier:** Opent als inline sectie onder de knop (geen modal). Twee velden:
- Aantal (number input, max = resterend)
- Locatie (select, huidige locatie uitgesloten)

Knop: "Splits" + "Annuleren".

**Verwijzing tussen orders:** Op de detailpagina, in het logistiek-blok, extra rij:
- Als `gesplitst_van`: "Gesplitst van: [123456](#link)"
- Als `gesplitst_naar`: "Gesplitst naar: [123456A](#link)"

### TypeScript type

```typescript
// In types/index.ts — toevoegen aan Order interface
gesplitst_van?: string | null
gesplitst_naar?: string | null
```

## Wat niet verandert

- Bestaande orders zonder split werken precies zoals nu
- Dashboard-queries hoeven niet aangepast — orders met een locatie verschijnen al op de juiste kolom
- Gereedmeldingen blijven per order, niet per locatie

## Succescriteria

- Een order splitsen verlaagt het originele aantal correct
- Het nieuwe order heeft een correct suffix-nummer en de juiste locatie
- Beide orders linken naar elkaar
- Na de split verschijnen beide orders op hun locatie op het dashboard
- Als resterend = 0, is de splits-knop niet zichtbaar
