# New Order System — Documentatie

**Service Pack b.v. | Order Management & Logistiek Platform**

---

## Inhoudsopgave

1. [Wat doet het systeem?](#wat-doet-het-systeem)
2. [Technische stack](#technische-stack)
3. [Gebruikers & toegang](#gebruikers--toegang)
4. [Hoofdmodules](#hoofdmodules)
   - [Orders](#orders)
   - [Leveringen](#leveringen)
   - [Vrachten](#vrachten)
   - [Facturen](#facturen)
   - [Voorraad](#voorraad)
   - [GiveX Import](#givex-import)
   - [Bijlagen](#bijlagen)
   - [Klanten & Codes](#klanten--codes)
5. [Volledige workflow: van order tot factuur](#volledige-workflow-van-order-tot-factuur)
6. [Datamodel](#datamodel)
7. [Statussen & overgangen](#statussen--overgangen)
8. [Berekeningen & logica](#berekeningen--logica)
9. [Navigatie & pagina-overzicht](#navigatie--pagina-overzicht)

---

## Wat doet het systeem?

Het **New Order System** is een intern platform voor Service Pack b.v. waarmee het team de volledige levenscyclus van orders beheert: van aanmaken en produceren tot leveren, verzenden en factureren.

**Kernfunctionaliteit op een rij:**

- Orders aanmaken en bijhouden (met verpakkingsconfiguratie, locatie, deadlines)
- Leveringen registreren per order (gedeeltelijk of volledig)
- Vrachten samenstellen en vrachtbrieven printen
- Facturen aanmaken op basis van leveringen
- Voorraadinzicht in real-time
- Automatisch orders aanmaken via GiveX Excel-imports
- Bestanden koppelen aan orders (specificaties, artwork, etc.)

---

## Technische stack

| Onderdeel | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (React 19, Server Actions) |
| Database | PostgreSQL via Supabase |
| Authenticatie | Supabase Auth (e-mail + wachtwoord) |
| Bestandsopslag | Supabase Storage |
| Styling | Tailwind CSS 4 |
| PDF-generatie | @react-pdf/renderer |
| Excel-parsing | XLSX (voor GiveX import) |
| Testen | Vitest + Testing Library |
| Taal | TypeScript |

Het systeem draait volledig server-side (Next.js server components + server actions), wat betekent dat er geen API-laag tussenin zit — de UI communiceert direct met de database.

---

## Gebruikers & toegang

- Toegang vereist een account (e-mail + wachtwoord)
- Alle ingelogde gebruikers hebben dezelfde rechten (geen rollen op dit moment)
- Acties worden bijgehouden via `aangemaakt_door` (user ID) en `aangemaakt_op` (timestamp)
- Uitloggen via de navigatiebalk

---

## Hoofdmodules

### Dashboard

**Route:** `/dashboard`

Het dashboard is de startpagina na inloggen. Het geeft een productie-overzicht per locatie — in één oogopslag zie je wat er waar bezig is.

**Opbouw:** drie kolommen, één per locatie (Lokkerdreef 20, Pauvreweg, WVB). Elke kolom toont:

| Sectie | Inhoud |
|--------|--------|
| **In behandeling** | Orders die actief in productie zijn |
| **Aankomend** | Bevestigde orders die nog starten |
| **Uitgaande vrachten** | Vrachten gepland voor vandaag of later |

**Wat je niet ziet op het dashboard:** concept-orders, geleverde orders en gefactureerde orders. Alleen wat nú relevant is.

**Deadline-kleuren op de orderkaartjes:**
- Rood — deadline is verstreken
- Oranje — deadline is vandaag of morgen
- Grijs — ruim op tijd

De vroegste deadline per locatie wordt ook in de kolomkop getoond, zodat je in één oogopslag ziet welke locatie het meest urgent is.

---

### Orders

**Route:** `/orders`

Orders zijn het centrale object in het systeem. Een order vertegenwoordigt een productieopdracht voor een specifieke klant.

**Velden per order:**

| Veld | Beschrijving |
|------|-------------|
| Order nummer | Handmatig ingevoerd — verplicht veld |
| Order code | Code van de klant / instructiecode |
| Klant | Gekoppelde klant |
| Facturatiecode | Tarief voor facturering |
| Order grootte | Totale hoeveelheid te produceren/leveren |
| Aantal per doos | Verpakkingsconfiguratie |
| Aantal per inner | Verpakkingsconfiguratie |
| Aantal per pallet | Verpakkingsconfiguratie |
| Bewerking | Beschrijving van speciale verwerking |
| Opwerken | Vlag: vereist speciale behandeling |
| Bio | Vlag: biologisch product |
| Locatie | Lokkerdreef 20 / Pauvreweg / WVB |
| Deadline | Uiterste datum |
| THT | Houdbaarheidsdatum |
| Status | Zie [Statussen](#statussen--overgangen) |

**Acties:**
- Order aanmaken (`/orders/nieuw`) — inclusief optie om bestaande order te klonen
- Order bewerken
- Order verwijderen
- Status doorvoeren via knoppen op de detailpagina
- Bestanden uploaden als bijlage

**Order artikelen:**
Per order kun je dynamisch berekende artikelen toevoegen (bijv. dozen, pallets). Zie [Berekeningen & logica](#berekeningen--logica).

---

### Leveringen

**Toegang via:** order detailpagina

Een levering registreert dat (een deel van) een order is uitgeleverd.

**Velden:**

| Veld | Beschrijving |
|------|-------------|
| Aantal geleverd | Hoeveelheid die is uitgeleverd |
| Leverdatum | Datum van levering |
| THT | Houdbaarheidsdatum van dit specifieke batch |
| Notities | Vrij tekstveld |

**Logica:**
- Een order kan meerdere gedeeltelijke leveringen hebben
- `Resterend = Order grootte − Totaal geleverd`
- Bij de eerste levering gaat de orderstatus automatisch naar `in_behandeling`

---

### Vrachten

**Route:** `/vrachten`

Een vracht bundelt één of meerdere leveringen voor dezelfde klant in één fysieke verzending. Bij aanmaken wordt een vrachtbrief gegenereerd.

**Workflow:**
1. Selecteer klant
2. Selecteer openstaande leveringen (van meerdere orders mogelijk)
3. Vracht aanmaken met datum en notities
4. Vrachtbrief (PDF) printen
5. Status omzetten naar `opgehaald` zodra de vracht is meegenomen

**Vrachtbrief nummer format:** `VB-YYYY-NNNN` (bijv. `VB-2026-0012`)

**Statussen:**
- `aangemaakt` — wacht op ophaling
- `opgehaald` — fysiek verzonden

**Factuur vanuit vracht:**
Vanuit een vracht kun je een gecombineerde factuur aanmaken die leveringen van meerdere orders dekt (zinvol als de orders verschillende tarieven hebben).

---

### Facturen

**Route:** `/facturen`

Facturen worden aangemaakt op basis van leveringen. Er zijn twee typen:

**1. Order-factuur** — gebaseerd op één order
- Selecteer welke leveringen van die order je wilt factureren
- Bedrag = Tarief (facturatiecode) × Totaal geleverde eenheden

**2. Vracht-factuur** — gebaseerd op een vracht
- Dekt leveringen van meerdere orders tegelijk
- Bedrag = Som van (tarief per order × hoeveelheid per order)

**Statussen:**
- `concept` → `verzonden` → `betaald`

**Factuurnummer:** Automatisch sequentieel gegenereerd via database-functie.

---

### Voorraad

**Route:** `/voorraad`

Real-time overzicht van resterende hoeveelheden per order, gegroepeerd per klant.

- Toont voortgangsbalken (geleverd vs. totaal)
- Gefactureerde orders worden uitgesloten
- Exporteerbaar als PDF per klant

---

### GiveX Import

**Toegang via:** klantpagina (`/klanten/[id]`)

GiveX is een extern systeem dat Excel-bestanden genereert met leveringsinstructies. Het New Order System kan deze bestanden automatisch verwerken.

**Workflow:**
1. Sleep een of meerdere GiveX Excel-bestanden naar de dropzone op de klantpagina
2. Het systeem parseert elk bestand en extraheert:
   - Documentnummer
   - Instructiecode
   - Leverdatum
   - Totale hoeveelheid
   - Rollencount (indien aanwezig)
3. De instructiecode wordt vergeleken met bestaande orders van deze klant (template-matching)
4. Als er een template gevonden wordt, wordt automatisch een nieuwe order aangemaakt met:
   - Dezelfde klant, facturatiecode en verpakkingsconfiguratie als de template
   - Hoeveelheid = GiveX hoeveelheid
   - Deadline = leverdatum uit GiveX
   - Artikelen worden ook gekopieerd van de template
5. Dubbele imports worden geblokkeerd (op basis van documentnummer)

---

### Bijlagen

**Toegang via:** order detailpagina

Bestanden (specificaties, artwork, etc.) kunnen gekoppeld worden aan orders.

- Upload via drag-and-drop of bestandsdialoog
- Beveiligde downloadlinks (tijdelijk geldig, 1 uur)
- Bestanden worden opgeslagen in Supabase Storage
- Verwijderen mogelijk per bestand
- Bij verwijderen van een order worden bijlagen automatisch verwijderd (cascade)

---

### Klanten & Codes

**Klanten** (`/klanten`):
- Naam, adres, postcode, stad, land
- Klantpagina toont ook GiveX-imports en orderhistorie

**Facturatiecodes** (`/codes`):
- Code + omschrijving + tarief (€ per eenheid)
- Actief/inactief
- Tarieven worden gebruikt voor automatische factuurberekening

---

## Volledige workflow: van order tot factuur

```
1. ORDER AANMAKEN
   → /orders/nieuw
   → Klant, code, grootte, verpakking, locatie, deadline
   → Status: concept

2. ORDER BEVESTIGEN
   → Statusknop op detailpagina
   → Status: bevestigd

3. LEVERING REGISTREREN
   → Op order detailpagina
   → Aantal geleverd + datum (+ eventueel THT en notities)
   → Status: in_behandeling (automatisch bij eerste levering)
   → Herhaal voor gedeeltelijke leveringen

4. VRACHT AANMAKEN (optioneel maar gebruikelijk)
   → /vrachten/nieuw
   → Selecteer klant + leveringen
   → Vrachtbrief PDF printen
   → Status vracht: aangemaakt → opgehaald

5. FACTUUR AANMAKEN
   → Via order: /facturen/nieuw?order_id=X
   → Via vracht: vanuit vracht-detailpagina
   → Selecteer leveringen, bedrag wordt berekend
   → Status: concept → verzonden → betaald
```

---

## Datamodel

### Hoofdtabellen

```
klanten
  id, naam, adres, postcode, stad, land

orders
  id, order_nummer, order_code
  klant_id → klanten
  facturatie_code_id → facturatie_codes
  order_grootte, aantal_per_doos, aantal_per_inner, aantal_per_pallet
  bewerking, opwerken, bio, omschrijving
  status, locatie, deadline, tht
  aangemaakt_door, aangemaakt_op

leveringen
  id, order_id → orders
  factuur_id → facturen (null totdat gefactureerd)
  aantal_geleverd, leverdatum, tht, notities
  aangemaakt_door, aangemaakt_op

vrachten
  id, klant_id → klanten
  vrachtbrief_nummer, datum, status, notities

vracht_regels
  id, vracht_id → vrachten
  levering_id → leveringen (uniek: elke levering in max. 1 vracht)

facturen
  id, factuur_nummer
  order_id → orders (null voor vracht-facturen)
  vracht_id → vrachten (null voor order-facturen)
  totaal_eenheden, tarief, totaal_bedrag
  status, factuurdatum
  aangemaakt_door, aangemaakt_op

facturatie_codes
  id, code, omschrijving, tarief, actief

order_bijlagen
  id, order_id → orders
  bestandsnaam, opslag_pad, bestandsgrootte, mime_type

order_artikelen
  id, order_id → orders
  naam, berekening_type (delen|vermenigvuldigen), factor, volgorde

give_x_imports
  id, klant_id → klanten
  documentnummer (uniek), instructie_code
  leverdatum, totaal_hoeveelheid, totaal_rollen, heeft_rollen
  order_id → orders (aangemaakt order)

profielen
  id → auth.users
  naam, email
```

### Cascade-verwijderingen

Wanneer een order wordt verwijderd:
- Bijlagen worden automatisch verwijderd (zowel database-records als opgeslagen bestanden)
- Artikelen worden automatisch verwijderd
- GiveX-importrecords worden ontkoppeld

---

## Statussen & overgangen

### Order statussen

```
concept
  ↓ (handmatig)
bevestigd
  ↓ (automatisch bij eerste levering)
in_behandeling
  ↓ (handmatig)
geleverd
  ↓ (automatisch bij factuuraanmaak)
gefactureerd
```

**Kleurcodering in de UI:**
- `concept` — grijs
- `bevestigd` — blauw
- `in_behandeling` — amber/oranje
- `geleverd` — groen
- `gefactureerd` — violet/paars

### Factuur statussen

```
concept → verzonden → betaald
```

### Vracht statussen

```
aangemaakt → opgehaald
```

---

## Berekeningen & logica

### Voorraad (resterend)

```
Resterend = Order grootte − Som van alle leveringen
```

Voorraadoverzicht sluit gefactureerde orders uit.

### Order artikelen

Artikelen zijn dynamisch berekend op basis van de order grootte:

| Type | Formule | Voorbeeld |
|------|---------|-----------|
| Delen | `⌈order_grootte ÷ factor⌉` | 1000 stuks ÷ 100 per doos = 10 dozen |
| Vermenigvuldigen | `round(order_grootte × factor)` | 1000 stuks × 0,5 = 500 eenheden |

### Factuur bedrag

**Order-factuur:**
```
Totaalbedrag = Tarief × Totaal geleverde eenheden
```

**Vracht-factuur:**
```
Totaalbedrag = Σ (tarief_per_order × geleverde_eenheden_per_order)
```

### Vrachtbrief nummer

Automatisch gegenereerd via database-functie:
```
VB-{jaar}-{volgnummer 4 cijfers}
Voorbeeld: VB-2026-0042
```

---

## Navigatie & pagina-overzicht

### Operationeel (dagelijks gebruik)

| Pagina | Route | Doel |
|--------|-------|------|
| Dashboard | `/dashboard` | Overzicht actieve orders |
| Orders | `/orders` | Lijst met zoeken en paginering |
| Order aanmaken | `/orders/nieuw` | Nieuw order invoeren |
| Order detail | `/orders/[id]` | Details, leveringen, bijlagen |
| Order bewerken | `/orders/[id]/bewerken` | Gegevens aanpassen |
| Vrachten | `/vrachten` | Openstaande en opgehaalde vrachten |
| Vracht aanmaken | `/vrachten/nieuw` | Leveringen bundelen |
| Vracht detail | `/vrachten/[id]` | Details, vrachtbrief, factuur |
| Facturen | `/facturen` | Alle facturen |
| Factuur aanmaken | `/facturen/nieuw` | Factuur genereren |
| Voorraad | `/voorraad` | Real-time voorraadoverzicht |

### Beheer

| Pagina | Route | Doel |
|--------|-------|------|
| Klanten | `/klanten` | Klantenbeheer + GiveX import |
| Facturatiecodes | `/codes` | Tarieven en codes beheren |

---

*Documentatie gegenereerd op 7 april 2026*
