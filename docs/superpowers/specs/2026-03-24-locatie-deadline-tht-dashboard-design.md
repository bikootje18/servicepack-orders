# Design: Locatie, Deadline, THT & Dashboard

**Datum:** 2026-03-24

## Overzicht

Drie nieuwe velden op orders (locatie, deadline, THT) plus een management dashboard dat per locatie lopende en aankomende orders en vrachten toont.

---

## Datamodel wijzigingen

### `orders` tabel

Drie nieuwe kolommen:

| Kolom | Type | Nullable | Standaard |
|---|---|---|---|
| `locatie` | `text` CHECK IN ('Lokkerdreef20', 'Pauvreweg', 'WVB') | Ja | NULL |
| `deadline` | `date` | Ja | NULL |
| `tht` | `date` | Ja | NULL |

`locatie` is nullable in de database zodat de migratie geen backfill vereist voor bestaande orders. In het UI-formulier is het veld verplicht voor nieuwe orders. Bestaande orders zonder locatie worden niet getoond op het dashboard.

**Display labels vs. opgeslagen waarden:**

| Opgeslagen waarde | Weergave |
|---|---|
| `Lokkerdreef20` | Lokkerdreef 20 |
| `Pauvreweg` | Pauvreweg |
| `WVB` | WVB |

### `leveringen` tabel

Één nieuw kolom:

| Kolom | Type | Nullable | Standaard |
|---|---|---|---|
| `tht` | `date` | Ja | NULL |

Alleen invullen als de THT van deze levering afwijkt van de THT op het order. Uitzondering, niet de regel.

### Locaties (vaste lijst)

Drie locaties, hardcoded als enum-waarden in de database constraint én als constante in de frontend:

- `Lokkerdreef20`
- `Pauvreweg`
- `WVB`

Geen beheerinterface nodig — de lijst is stabiel.

---

## Order formulier

Het bestaande aanmaak- en bewerkformulier (`/orders/nieuw` en `/orders/[id]/bewerken`) krijgt drie nieuwe velden:

- **Locatie** — verplicht dropdown (Lokkerdreef 20 / Pauvreweg / WVB)
- **Deadline** — optionele datepicker
- **THT** — optionele datepicker

Op de orderdetailpagina worden locatie, deadline en THT getoond als ze aanwezig zijn.

---

## Leveringformulier

Het leveringformulier (`LeveringForm`) krijgt één nieuw optioneel veld:

- **THT (afwijkend)** — optionele datepicker, met een label dat aangeeft dat dit alleen ingevuld wordt als de THT afwijkt van het order

De THT per levering is zichtbaar in de leveringenlijst op de orderdetailpagina.

---

## Dashboard (`/dashboard`)

### Doel

Management-overzicht van alle lopende en aankomende activiteit, gesorteerd per locatie. Primair gebruik: inzicht in werkdruk per locatie, deadlines, en uitgaande vrachten.

### Layout

Drie kolommen naast elkaar, één per locatie: **Lokkerdreef 20**, **Pauvreweg**, **WVB**.

Elke kolom toont:

1. **Koptekst** — locatienaam + aantal orders in behandeling + eerstvolgende deadline (alleen getoond als er orders met deadline zijn)
2. **In behandeling** — orders met status `in_behandeling`, gesorteerd op deadline (orders zonder deadline onderaan)
3. **Aankomend** — orders met status `bevestigd`, apart gesectie zodat management onderscheid ziet tussen lopend en gepland werk
4. **Uitgaande vrachten** — vrachten met datum >= vandaag, waarvan minimaal één levering via `vracht_regels → leveringen → orders.locatie` aan deze locatie gekoppeld is

### Order kaartje

Per order in de kolom:
- Ordernummer + klant
- Status badge
- Deadline (gemarkeerd in oranje als deadline vandaag of morgen is, rood als verlopen)
- THT indien aanwezig
- Order grootte (`order_grootte` — bestaand veld op `orders`, het aantal bestelde eenheden)

### Deadline markering

| Situatie | Weergave |
|---|---|
| Meer dan 1 dag weg | Normaal |
| Vandaag of morgen (0–1 dagen) | Oranje label |
| Verlopen (< vandaag) | Rood label |
| Geen deadline | Geen label |

### Koptekst

- **Aantal actieve orders** — telt alleen `in_behandeling` orders
- **Eerstvolgende deadline** — komt uit alle orders in de kolom (zowel `in_behandeling` als `bevestigd`), alleen getoond als er minimaal één order met deadline is

Orders zonder locatie verschijnen niet op het dashboard, ongeacht de sectie.

### Vrachten sectie

Per kolom een compacte lijst van vrachten met `datum >= vandaag`. Een vracht kan leveringen aan meerdere locaties hebben en verschijnt dan in meerdere kolommen tegelijk. Per vracht: datum + vrachtbrief nummer + naam van de klant op de vracht (`vrachten.klant_id` — één klant per vracht).

**Join pad (alle foreign keys bestaan al in het schema):**
`vrachten` → `vracht_regels.vracht_id` / `vracht_regels.levering_id` → `leveringen.order_id` → `orders.locatie`

### Locatie-koppeling

Zowel orders als vrachten worden aan een locatie gekoppeld via `orders.locatie`. Vrachten hebben zelf geen locatieveld — de koppeling loopt altijd via de leveringen die aan de vracht hangen.

---

## Validatie van locatie

`locatie` is nullable in de database maar verplicht in de UI voor nieuwe orders. Server Actions die orders aanmaken of bijwerken valideren dat `locatie` aanwezig is voordat ze de insert/update uitvoeren — niet alleen client-side. Bestaande orders zonder locatie blijven geldig maar verschijnen niet op het dashboard.

---

## Implementatiestrategie

De wijzigingen zijn opgesplitst in twee onafhankelijke tracks die parallel kunnen lopen na de database migratie:

**Track 1 — Database + formulieren**
1. Migratie: locatie/deadline/tht op orders, tht op leveringen
2. Order formulier (nieuw + bewerken): drie nieuwe velden
3. Levering formulier: optionele THT
4. Orderdetailpagina: nieuwe velden tonen

**Track 2 — Dashboard**
1. Data query: orders per locatie met deadline/tht, vrachten per locatie
2. Dashboard pagina `/dashboard` met kolomlayout
3. Order kaartje component
4. Navigatie: dashboard link toevoegen

Track 2 heeft de database migratie nodig maar is verder onafhankelijk van Track 1.

---

## Wat buiten scope valt

- Beheerscherm voor locaties (vaste lijst, niet nodig)
- Notificaties of alerts voor naderende deadlines
- Historische data / rapportages
- Filtering of zoeken op het dashboard
