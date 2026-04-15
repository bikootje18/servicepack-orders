# Design: Losse Pallet-CMR

**Datum:** 2026-04-15

## Context

Chauffeurs leveren soms een handgeschreven lijst van pallets die ze geladen hebben (bier per merk, vollе pallets of losse kratten). Hiervan moet een printbare CMR overlay gegenereerd worden — dezelfde stijl als de bestaande vrachtbrief CMR. Deze flow is volledig los van orders, leveringen en klanten.

## Route & navigatie

Nieuwe pagina: `/cmr-pallet`
Link toevoegen in de bestaande navigatie naast "Vrachten".

## Productcatalogus

Hardcoded constante in `src/lib/constants/pallet-producten.ts`. Geen database. Bevat alle 31 producten van de referentielijst:

| Naam | Artikelnummer | Pallettype | Kratten per pallet |
|---|---|---|---|
| Duvel 33cl | Krat 6 | chep | 63 |
| Chouffe 33cl | Krat 6 | chep | 63 |
| Liefmans | Krat 6 | chep | 70 |
| Vedett 33cl | Krat 6 | chep | 63 |
| Moortgat (zwart 33cl) | Krat 6 | chep | 70 |
| Maredsous 33cl | Krat 6 | chep | 63 |
| De Koninck | Krat 6 | chep | 60 |
| Warsteiner 24x33/50cl | Krat 6 | euro | 40 |
| Konig Ludwig 50cl | Krat 6 | euro | 40 |
| Benediktiner 20x50cl | Krat 2 | euro | 40 |
| Westmalle 24x33cl EIGEN | Krat 6 | chep | 54 |
| Rochefort 24x33cl | Krat 6 | chep | 54 |
| Zundert 24x33cl | Krat 6 | chep | 60 |
| Achel 24x33cl | Krat 6 | chep | 60 |
| Orval | Krat 6 | chep | 49 |
| Brugse zot 24x33cl | Krat 6 | chep | 60 |
| Straffe Hendrik 24x33cl | Krat 6 | chep | 60 |
| Wittekerke 25x33cl | Krat 6 | chep | 70 |
| Kwaremont 24x33cl | Krat 6 | chep | 70 |
| Petrus 24x33cl | Krat 6 | chep | 60 |
| Wieze 24x33cl | Krat 6 | chep | 70 |
| Gulpener 4x6x30cl (pinolen) | Krat 1142 | dpb | 70 |
| Gulpener 24x30cl | Krat 6 | dpb | 70 |
| Neubourg 24x33cl EIGEN | Krat 6 | dpb | 60 |
| Chimay | Krat 6 | chep | 56 |
| Becks | Krat 6 | dpb | 60 |
| Antwerpse 24x33cl | Krat 6 | chep | 56 |
| 12x37,5cl (Groene fles) | Krat 183 | chep | 84 |
| Gouden Carolus 24x33cl | Krat 10 | chep | 60 |
| Kasseler | Krat 6 | dpb | 60 |
| Kasteel | Krat 10 | chep | 56 |

## Formulier (`/cmr-pallet`)

Client-component met lokale state. Twee secties:

### 1. Vaste producten

Tabel met alle 31 producten. Per rij:
- Selectievakje (standaard uit)
- Productnaam + artikelnummer (readonly)
- Pallettype (readonly)
- Kratten per pallet (readonly)
- Invoer-modus toggle: **Pallets** of **Kratten**
- Getal-invoerveld

Berekening:
- Modus "Pallets": `aantal_pallets × kratten_per_pallet = totaal_kratten`
- Modus "Kratten": `totaal_kratten = ingevoerd getal` (losse/onvolledige pallet)

Alleen geselecteerde rijen (selectievakje aan + invoer > 0) verschijnen op de CMR.

### 2. Handmatige rijen

Knop "+ Voeg toe" onderaan de tabel. Elke handmatige rij heeft vrije invoervelden:
- Productnaam (tekst)
- Pallettype (dropdown: Chep / Euro / DPB)
- Invoer-modus toggle: Pallets of Kratten
- Bij modus "Pallets": ook kratten-per-pallet invoeren + aantal pallets
- Bij modus "Kratten": alleen aantal kratten

Rijen kunnen verwijderd worden.

### CMR genereren

Knop "CMR downloaden" onderaan. Disabled zolang er geen geselecteerde/ingevulde regels zijn. Genereert direct een PDF — zelfde mechanisme als de bestaande `VrachtbriefKnop` (client-side via `@react-pdf/renderer`).

## PDF component: `LosCmrOverlayDocument`

Nieuw component in `src/components/vrachten/LosCmrOverlayDocument.tsx`. Zelfde opmaak en positionering als `CmrOverlayDocument`.

**Vaste waarden:**
- Afzender: uit `BEDRIJF` constante (Service Pack)
- Ontvanger: BSB, Etten-Leur (hardcoded)
- Datum: `new Date()` op moment van genereren

**Goederen per regel:**
- Volle pallets: `Duvel 33cl — 3 pallets Chep à 63 kratten = 189 kratten`
- Losse kratten: `Liefmans — 29 kratten Chep`

**Totaal geladen:**
Gegroepeerd per pallettype, zelfde stijl als bestaand:
`Totaal geladen op   3 Cheps + 1 Euro`

## Nieuwe bestanden

- `src/lib/constants/pallet-producten.ts` — productcatalogus constante
- `src/app/(app)/cmr-pallet/page.tsx` — pagina (Server Component wrapper)
- `src/components/cmr-pallet/PalletCmrForm.tsx` — client formulier
- `src/components/cmr-pallet/LosCmrOverlayDocument.tsx` — PDF component

## Gewijzigde bestanden

- `src/app/(app)/layout.tsx` (of nav component) — link toevoegen
