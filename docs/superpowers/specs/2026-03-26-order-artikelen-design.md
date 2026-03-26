# Order Artikelen — Design Spec

**Datum:** 2026-03-26
**Status:** Goedgekeurd

## Samenvatting

Voeg een optionele "Artikelen" sectie toe aan orders. Artikelen zijn extra items die bij een order worden meegeleverd (bijv. omdozen, dollies, bandjes). Ze zijn puur informatief en verschijnen niet op vrachtbrieven. Het systeem berekent automatisch het aantal op basis van `order_grootte` (het `integer NOT NULL CHECK (order_grootte > 0)` veld op de `orders` tabel) en een door de gebruiker opgegeven factor.

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

`volgorde` is de array-index (0, 1, 2, ...) vanuit de formulierstate. `saveArtikelen` schrijft dit bij elke save. Er is geen UI voor het herordenen — volgorde is de invoervolgorde van de gebruiker. Ophalen gebeurt op `volgorde ASC`.

**Berekening van het aantal (niet opgeslagen, altijd live berekend in TypeScript):**
- `delen`: `Math.ceil(order_grootte / factor)` — altijd naar boven afronden (logistiek: nooit te weinig verpakkingen)
- `vermenigvuldigen`: `Math.round(order_grootte * factor)` — naar dichtstbijzijnde gehele getal

Als `order_grootte` `null` of `undefined` is (nog niet ingevuld tijdens aanmaken): toon `—`. De guard is `order_grootte == null`. Zero hoeft niet gecontroleerd te worden — de DB heeft `CHECK (order_grootte > 0)`.

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

De nieuwe order pagina accepteert een `?klant_id=` query param (zelfde patroon als het bestaande `?kloon=` voor klonen). De server component roept `getLaatsteArtikelenVoorKlant(klantId)` aan en geeft de resultaten mee als `initialArtikelen` prop aan `ArtikelenForm`.

Als zowel `?kloon=` als `?klant_id=` aanwezig zijn, heeft `kloon` voorrang — de artikelen komen dan uit de gekloonde order en `klant_id` auto-kopie wordt genegeerd.

`getLaatsteArtikelenVoorKlant` zoekt de meest recente order van de klant (op `aangemaakt_op DESC`) **die minimaal één artikel heeft**. Als geen enkele vorige order artikelen heeft, geeft de functie een lege array terug (sectie ingeklapt).

### Opslaan

`saveArtikelen(orderId, regels[])` is een **gewone async helper** (geen `"use server"` bestand), geïmporteerd vanuit `src/lib/db/artikelen.ts` en aangeroepen vanuit de bestaande order server actions.

Voor aanmaken: eerst order insert → dan `saveArtikelen`. Als `saveArtikelen` mislukt, bestaat de order zonder artikelen. Dit is acceptabel: artikelen zijn supplementair, de gebruiker kan ze via bewerken alsnog toevoegen. Geen rollback nodig.

Voor bewerken: als de toggle **nooit is uitgevouwen**, wordt `saveArtikelen` niet aangeroepen — bestaande artikelen blijven ongewijzigd. Als de toggle **wel is uitgevouwen** (ook als de gebruiker daarna alles verwijderd heeft), vervangt `saveArtikelen` volledig (delete bestaande + bulk insert nieuwe). `ArtikelenForm` geeft de opengesteld-staat mee in de formdata zodat de server action dit onderscheid kan maken. Als de delete slaagt maar de insert mislukt, heeft de order tijdelijk geen artikelen. De gebruiker kan bewerken opnieuw proberen.

Als de gebruiker de sectie uitvouwt maar alle rijen verwijdert: `saveArtikelen` doet delete + geen inserts. Eindresultaat is identiek aan "geen artikelen".

### Order detailpagina

Als de order geen artikelen heeft: sectie niet tonen. Als er artikelen zijn: read-only tabel met naam, type, factor en berekend aantal.

---

## Architectuur

### Nieuwe bestanden

| Bestand | Verantwoordelijkheid |
|---------|----------------------|
| `supabase/migrations/012_order_artikelen.sql` | Tabel aanmaken + RLS |
| `src/lib/db/artikelen.ts` | `getArtikelenVoorOrder(orderId)`, `getLaatsteArtikelenVoorKlant(klantId)`, `saveArtikelen(orderId, regels[])` |
| `src/components/orders/ArtikelenForm.tsx` | Client component: toggle + dynamische rijen + live berekening |

### Aanpassingen bestaande bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/types/index.ts` | `OrderArtikel` type toevoegen |
| `src/app/(app)/orders/nieuw/page.tsx` | `klant_id` query param uitlezen + `getLaatsteArtikelenVoorKlant` aanroepen + `ArtikelenForm` renderen + `saveArtikelen` aanroepen in de order server action |
| `src/app/(app)/orders/[id]/bewerken/page.tsx` | `getArtikelenVoorOrder` aanroepen + `ArtikelenForm` renderen + `saveArtikelen` aanroepen in de bewerk server action |
| `src/app/(app)/orders/[id]/page.tsx` | Artikelen read-only tonen (sectie verborgen als leeg) |

---

## Niet in scope

- Artikelen op vrachtbrieven
- Vaste artikelcatalogus / herbruikbare artikeldefinities
- Artikelen beïnvloeden facturatie of order grootte
- Drag-and-drop volgorde beheer
