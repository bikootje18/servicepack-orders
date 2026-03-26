# Order Artikelen — Design Spec

**Datum:** 2026-03-26
**Status:** Goedgekeurd

## Samenvatting

Voeg een optionele "Artikelen" sectie toe aan orders. Artikelen zijn extra items die bij een order worden meegeleverd (bijv. omdozen, dollies, bandjes). Ze zijn puur informatief en verschijnen niet op vrachtbrieven. Het systeem berekent automatisch het aantal op basis van de order grootte en een door de gebruiker opgegeven factor.

---

## Datamodel

Nieuwe tabel `order_artikelen`:

```sql
CREATE TABLE order_artikelen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  naam text NOT NULL,
  berekening_type text NOT NULL CHECK (berekening_type IN ('delen', 'vermenigvuldigen')),
  factor numeric(10,4) NOT NULL CHECK (factor > 0),
  volgorde integer NOT NULL DEFAULT 0,
  aangemaakt_op timestamptz NOT NULL DEFAULT now()
);
```

**Berekening van het aantal (niet opgeslagen, altijd live):**
- `delen`: `ceil(order_grootte / factor)`
- `vermenigvuldigen`: `round(order_grootte * factor)`

**RLS:** authenticated users kunnen alle artikelen beheren (zelfde patroon als de rest van het systeem).

---

## UI & Interactie

### Order aanmaken / bewerken

- Kopje "Artikelen" met een ja/nee toggle.
- Standaard **uitgevouwen** als er artikelen zijn (auto-kopie of bewerken), standaard **ingeklapt** bij een nieuwe order zonder voorgeschiedenis.
- Als uitgevouwen: tabel met per rij:
  - Naam (vrije tekst, bijv. "ser8030")
  - Type: dropdown `Delen` / `Vermenigvuldigen`
  - Factor: numeriek inputveld
  - Berekend aantal: read-only, live berekend op basis van `order_grootte`
- Knop "+ Artikel toevoegen" onder de tabel.
- Prullenbak-icoontje per rij om te verwijderen.

### Auto-kopie bij nieuwe order

Bij het aanmaken van een nieuwe order: zodra een klant geselecteerd is, haalt het systeem de artikelen op van de meest recente order van die klant. Ze worden automatisch ingevuld in de lijst (sectie uitgevouwen). De gebruiker kan ze aanpassen of verwijderen voor opslaan.

### Opslaan

Artikelen worden opgeslagen via een aparte server action na het opslaan van de order. Bij bewerken: volledige vervanging (delete bestaande + insert nieuwe regels).

### Order detailpagina

Artikelen worden getoond als read-only tabel: naam, type, factor, berekend aantal.

---

## Architectuur

### Nieuwe bestanden

| Bestand | Verantwoordelijkheid |
|---------|----------------------|
| `supabase/migrations/012_order_artikelen.sql` | Tabel aanmaken + RLS |
| `src/lib/db/artikelen.ts` | `getArtikelenVoorOrder(orderId)`, `getLaatsteArtikelenVoorKlant(klantId)` |
| `src/lib/actions/artikelen.ts` | `saveArtikelen(orderId, regels[])` — delete + insert |
| `src/components/orders/ArtikelenForm.tsx` | Client component: toggle + dynamische rijen + live berekening |

### Aanpassingen bestaande bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/types/index.ts` | `OrderArtikel` type toevoegen |
| `src/app/(app)/orders/nieuw/page.tsx` | `getLaatsteArtikelenVoorKlant` aanroepen + `ArtikelenForm` renderen |
| `src/app/(app)/orders/[id]/bewerken/page.tsx` | `getArtikelenVoorOrder` aanroepen + `ArtikelenForm` renderen |
| `src/app/(app)/orders/[id]/page.tsx` | Artikelen read-only tonen |

---

## Niet in scope

- Artikelen op vrachtbrieven
- Vaste artikelcatalogus / herbruikbare artikeldefinities
- Artikelen beïnvloeden facturatie of order grootte
