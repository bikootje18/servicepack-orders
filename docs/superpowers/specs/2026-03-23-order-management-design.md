# Orderbeheersysteem – Ontwerpdocument

**Datum:** 2026-03-23
**Project:** OSS v2 – Order Management Web App
**Status:** Goedgekeurd

---

## 1. Projectoverzicht

Een webapplicatie voor het beheren van orders bij een copacker. Het systeem ondersteunt het volledig traject van orderinvoer tot facturatie, inclusief voorraadbeheer per klant.

**Bedrijfscontext:**
- Copacker met ~100–200 klanten
- Werkzaamheden variëren per klant (bijv. stickers plakken, labelen, verpakken)
- Veel herhalende orders van dezelfde klanten
- Meerdere medewerkers gebruiken het systeem gelijktijdig

**Doelen:**
- Orders snel invoeren, ook op basis van een vorige order
- Leveringen (gedeeltelijk of volledig) bijhouden per order
- Facturen aanmaken en printen op basis van geleverde eenheden × tarief
- Voorraadoverzicht per klant (wat staat er nog in het magazijn)
- Exporteerbaar overzicht voor klanten

---

## 2. Tech Stack

| Onderdeel | Keuze | Reden |
|-----------|-------|-------|
| Framework | Next.js 14 (App Router) | Server Components, Server Actions, geen aparte API laag nodig |
| Database & Auth | Supabase (PostgreSQL) | Relationeel model past goed bij orders/leveringen, ingebouwde auth |
| Styling | Tailwind CSS | Snel, consistent |
| PDF generatie | react-pdf | Facturen en voorraadoverzichten printen/exporteren |
| Deployment | Vercel | Eenvoudig, directe integratie met Next.js |

**Architectuurkeuze:** Single Next.js app (Option A). Geen aparte API-laag. Server Components en Server Actions communiceren direct met Supabase. Één repo, één deployment.

---

## 3. Pagina's

| Route | Naam | Doel |
|-------|------|------|
| `/` | Dashboard | Overzicht actieve orders (status ≠ gefactureerd), voorraadwaarschuwingen |
| `/orders` | Orders | Lijst van alle orders, filterbaar op bedrijf/status |
| `/orders/nieuw` | Nieuwe order | Order aanmaken (leeg of kloon van vorige) |
| `/orders/[id]` | Orderdetail | Leveringen, status, geschiedenis |
| `/orders/[id]/bewerken` | Order bewerken | Velden aanpassen |
| `/facturen` | Facturen | Lijst van facturen, printen/exporteren |
| `/voorraad` | Voorraad | Magazijnoverzicht per klant, exporteerbaar per klant als PDF |
| `/klanten` | Klanten | Beheer klantenlijst |
| `/codes` | Facturatie codes | Beheer van codes en tarieven |
| `/login` | Inloggen | Authenticatie |

---

## 4. Datamodel

### `klanten`
| Veld | Type | Omschrijving |
|------|------|-------------|
| `id` | uuid | Primaire sleutel |
| `naam` | text | Bedrijfsnaam |
| `aangemaakt_op` | timestamp | |

*Reden voor aparte tabel: met 100–200 klanten en herhalende orders voorkomt dit typefouten en inconsistenties in rapportages en voorraadoverzichten.*

### `facturatie_codes`
| Veld | Type | Omschrijving |
|------|------|-------------|
| `id` | uuid | Primaire sleutel |
| `code` | text | Unieke code, bijv. `bedrijf_x_sticker_laptop01` |
| `omschrijving` | text | Leesbare beschrijving |
| `tarief` | decimal | Tarief per eenheid (€, excl. BTW) |
| `actief` | bool | Inactieve codes verschijnen niet in dropdowns bij nieuwe orders |
| `aangemaakt_op` | timestamp | |

*Het tarief is bewerkbaar. Een tariefwijziging heeft geen effect op bestaande orders of facturen – het tarief wordt vastgelegd als snapshot op het moment van facturatie.*

### `orders`
| Veld | Type | Omschrijving |
|------|------|-------------|
| `id` | uuid | Primaire sleutel |
| `order_nummer` | text | Uniek ordernummer |
| `order_code` | text | Product-/jobtype, kan herhalen bij zelfde job |
| `klant_id` | uuid | FK → klanten |
| `facturatie_code_id` | uuid | FK → facturatie_codes – verplicht bij aanmaken |
| `order_grootte` | int | Totaal aantal eenheden |
| `aantal_per_doos` | int | Eenheden per doos |
| `aantal_per_inner` | int | Eenheden per inner |
| `aantal_per_pallet` | int | Eenheden per pallet |
| `bewerking` | text | Verwerkingsinstructie |
| `opwerken` | bool | Opwerken vlag |
| `omschrijving` | text | Beschrijving / notities |
| `status` | enum | Zie statussen hieronder |
| `aangemaakt_door` | uuid | FK → auth.users |
| `aangemaakt_op` | timestamp | |

*Noot: het `artikel` veld uit het vorige systeem (lijst van artikeltypen + aantallen) is bewust weggelaten – de nieuwe opzet werkt met één order_code per order.*

### Orderstatussen

| Status | Trigger |
|--------|---------|
| `concept` | Aangemaakt, nog niet bevestigd |
| `bevestigd` | Handmatig door medewerker, klant heeft order bevestigd |
| `in_behandeling` | Handmatig door medewerker, order is in uitvoering |
| `geleverd` | Automatisch wanneer SUM(leveringen) = order_grootte |
| `gefactureerd` | Automatisch wanneer **alle** leveringen van de order een `factuur_id` hebben (volledig gefactureerd). Gedeeltelijk gefactureerde orders behouden de vorige status. |

### `leveringen`
| Veld | Type | Omschrijving |
|------|------|-------------|
| `id` | uuid | Primaire sleutel |
| `order_id` | uuid | FK → orders |
| `factuur_id` | uuid | FK → facturen (nullable) – null = nog niet gefactureerd |
| `aantal_geleverd` | int | Geleverde eenheden in deze levering |
| `leverdatum` | date | Datum van levering |
| `notities` | text | Optionele notities |
| `aangemaakt_door` | uuid | FK → auth.users |
| `aangemaakt_op` | timestamp | |

*Dubbele facturatie voorkoming: `factuur_id IS NULL` betekent ongefactureerd. Bij aanmaken factuur worden alleen leveringen getoond waarbij `factuur_id IS NULL`. Na opslaan factuur wordt `factuur_id` ingesteld op alle meegenomen leveringen (atomair, binnen één transactie).*

### `facturen`
| Veld | Type | Omschrijving |
|------|------|-------------|
| `id` | uuid | Primaire sleutel |
| `factuur_nummer` | text | Automatisch gegenereerd via DB-sequence, bijv. `2026-0001` – nooit app-side berekend om dubbele nummers bij gelijktijdig gebruik te voorkomen |
| `order_id` | uuid | FK → orders |
| `totaal_eenheden` | int | Totaal gefactureerde eenheden (som van meegenomen leveringen) |
| `tarief` | decimal | Tarief op moment van facturatie (snapshot van facturatie_codes.tarief) |
| `totaal_bedrag` | decimal | Berekend: tarief × totaal_eenheden (excl. BTW) |
| `status` | enum | `concept` · `verzonden` · `betaald` |
| `factuurdatum` | date | |
| `aangemaakt_door` | uuid | FK → auth.users |
| `aangemaakt_op` | timestamp | |

*Meegenomen leveringen zijn opvraagbaar via `SELECT * FROM leveringen WHERE factuur_id = ?` – geen aparte array kolom nodig.*

**Voorraad** wordt afgeleid – geen aparte tabel:
```
resterend_voorraad = order_grootte - SUM(leveringen.aantal_geleverd)
```
*Een volledig geleverde maar nog niet volledig gefactureerde order toont 0 resterend voorraad – voorraad is gebaseerd op leveringen, niet op facturatie.*

---

## 5. Workflows

### Order aanmaken
1. Gebruiker gaat naar `/orders/nieuw`
2. Kiest: leeg formulier **of** kloon van bestaande order
3. **Kloon:** zoeken op `order_code` of klantnaam – lijst toont meest recente overeenkomsten, gebruiker selecteert de gewenste order. Alle velden worden overgenomen inclusief `facturatie_code_id`. Gebruiker past aan wat nodig is (meestal alleen `order_grootte`).
4. `facturatie_code_id` is verplicht – order kan niet worden opgeslagen zonder
5. Opslaan → status wordt `concept`
6. Handmatig naar `bevestigd` → `in_behandeling` via knoppen op orderdetailpagina

### Levering registreren
1. Vanuit orderdetailpagina: knop "Levering toevoegen"
2. Invoer: aantal geleverde eenheden + leverdatum + optionele notities
3. Systeem toont resterend: `order_grootte - al geleverd`
4. Bij volledige levering: orderstatus automatisch naar `geleverd`
5. Gedeeltelijke leveringen volledig ondersteund

### Factuur aanmaken
1. Vanuit orderdetailpagina: knop "Factuur aanmaken"
2. Systeem toont alleen leveringen waarbij `gefactureerd = false`
3. Gebruiker selecteert welke leveringen mee te nemen
4. Systeem berekent: `tarief (snapshot) × totaal_eenheden`
5. Factuur opslaan – `factuur_nummer` automatisch gegenereerd via DB-sequence (atomair, concurrent-safe)
6. `factuur_id` ingesteld op meegenomen leveringen (atomair, binnen één transactie)
7. Als alle leveringen van de order nu een `factuur_id` hebben → orderstatus automatisch naar `gefactureerd`
8. PDF genereren met: klantnaam, factuur_nummer, ordernummer, regelitems, totaalbedrag excl. BTW, BTW-melding (zie sectie 7)

### Voorraadoverzicht
1. Pagina `/voorraad` toont alle actieve orders gegroepeerd op klant
2. Per order: ordernummer, totaal eenheden, geleverd, resterend
3. **Export per klant:** knop per klant genereert PDF van die klant's resterend voorraad – geschikt voor verzending naar klant

### Facturatie codes beheren (`/codes`)
1. Overzicht van alle codes met tarief en status (actief/inactief)
2. Nieuwe code aanmaken: code, omschrijving, tarief
3. Code bewerken: tarief aanpassen – effect alleen op toekomstige facturen
4. Code deactiveren: verschijnt niet meer in dropdown bij nieuwe orders, bestaande orders onaangetast

### Dashboard (`/`)
- Actieve orders (status ≠ `gefactureerd`) gesorteerd op aanmaakdatum
- Standaard gefilterd op laatste 90 dagen; aanpasbaar via datumfilter
- Snelle filters: per klant, per status
- Waarschuwing bij orders die volledig geleverd zijn maar nog niet gefactureerd

### Orders lijst (`/orders`)
- Paginering: standaard 50 rijen per pagina
- Filterbaar op klant, status, datum
- Zoekveld op order_nummer en order_code

---

## 6. Authenticatie & Gebruikers

- Supabase Auth (e-mail + wachtwoord)
- Alle ingelogde gebruikers hebben gelijke toegang – geen rollen
- Een publieke `profielen` tabel (id, naam, e-mail) spiegelt gebruikersgegevens vanuit `auth.users` zodat weergavenamen opvraagbaar zijn in de applicatie zonder directe query op het auth-schema
- Klantentoegang (login voor klanten om eigen voorraad te zien) is buiten scope voor demo

---

## 7. Buiten Scope (Demo)

- **BTW (omzetbelasting):** Facturen tonen bedragen excl. BTW. BTW-berekening en -verwerking zijn buiten scope. PDF factuur vermeldt expliciet "Bedragen excl. BTW" zodat dit niet als officieel belastingdocument wordt gebruikt.
- Klantenportaal / klantlogin
- Barcode scannen / palletverwerking
- Urenregistratie / personeelsbeheer
- E-mail integratie (orders binnenkomen via e-mail – handmatig ingevoerd)
- Mobiele app
