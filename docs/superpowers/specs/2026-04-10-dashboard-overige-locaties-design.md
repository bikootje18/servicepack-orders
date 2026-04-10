# Dashboard: Vierde kolom + deadline-drempel

**Datum:** 2026-04-10  
**Status:** Goedgekeurd

## Samenvatting

Het dashboard toont momenteel orders voor drie vaste locaties (Lokkerdreef 20, Pauvreweg, WVB). Orders op de vijf overige locaties (Darero, WVS, Rotterdam, Sittard, Gilze) zijn niet zichtbaar. Dit lost twee problemen op:

1. Voeg een vierde kolom "Overige locaties" toe die orders van alle externe locaties samenvoegt.
2. Vergroot de deadline-drempel voor "bijna verlopen" van 1 naar 2 dagen.

## Wijziging 1 — Vierde kolom "Overige locaties"

### Datalaag

`getOrdersPerLocatie()` in `src/lib/db/dashboard.ts` retourneert nu een record per individuele locatie. Dit blijft zo. De samenvoeging van externe locaties gebeurt in de UI, niet in de query.

Een nieuwe helperfunctie `getOrdersOverigeLocaties()` (of uitbreiding van de bestaande functie) levert orders samen voor alle locaties met `dashboard: false`:
- Darero, WVS, Rotterdam, Sittard, Gilze
- Zelfde query-structuur: status `in_behandeling` of `bevestigd`, gesorteerd op deadline ascending

### UI

- `src/app/(app)/dashboard/page.tsx`: grid wordt `grid-cols-4`, vierde kolom krijgt een `LocatieKolom` met label "Overige locaties"
- Kleur van de vierde kolom: `#6b7280` (grijs — neutraal, anders dan de drie vaste locaties)
- `LocatieKolom` hoeft niet aangepast te worden — dezelfde component werkt voor de vierde kolom

### Constanten

`LOCATIES` in `src/lib/constants/locaties.ts` heeft al een `dashboard` vlag. De filter `LOCATIES.filter(l => !l.dashboard)` levert de externe locaties op. Geen schema-wijziging nodig.

## Wijziging 2 — Deadline-drempel naar 2 dagen

`deadlineKleur()` in `src/lib/db/dashboard.ts`:

```
// Huidig
if (dagVerschil <= 1) return 'oranje'

// Nieuw
if (dagVerschil <= 2) return 'oranje'
```

Deze functie wordt gebruikt op:
- `OrderKaartje` (kleur van de urgentiebalk en deadline-badge)
- `LocatieKolom` (kleur van vroegste deadline in de kolomheader)

Beide worden automatisch bijgewerkt door deze ene wijziging.

## Wat niet verandert

- De drie bestaande kolommen blijven ongewijzigd
- Geen nieuwe componenten nodig
- Geen database-migraties nodig
- Geen wijzigingen aan andere pagina's

## Succescriteria

- Orders op externe locaties (status `in_behandeling` of `bevestigd`) zijn zichtbaar in de vierde kolom
- Orders met een deadline over 2 dagen of minder krijgen een oranje markering (was: 1 dag)
- Het dashboard blijft overzichtelijk met vier even brede kolommen
