# Gereedmelding cascade verwijderen

**Datum:** 2026-04-14  
**Status:** Goedgekeurd

## Probleem

Een gereedmelding die al in een factuur zit kan momenteel niet verwijderd worden — de "Verwijderen" knop is verborgen zodra `factuur_id` is ingesteld. Als een gereedmelding per ongeluk aangemaakt is (inclusief vracht en factuur), is er geen eenvoudige manier om dit terug te draaien. Alles handmatig verwijderen is te omslachtig.

Facturen worden intern gebruikt en worden niet automatisch verstuurd — het is veilig om ze te verwijderen als onderdeel van een herstelactie.

## Oplossing

De "Verwijderen" knop wordt altijd getoond. Bij het verwijderen van een gereedmelding worden automatisch de bijbehorende factuur, vracht-regelkoppeling, en eventueel de vracht zelf meegenomen.

## Ontwerp

### Datalaag — `src/lib/db/leveringen.ts`

Nieuwe functie `deleteLeveringMetCascade(id: string)`:

1. Haal de gereedmelding op — lees `factuur_id`
2. Zoek bijbehorende `vracht_regel` op via `levering_id` — lees `vracht_id`
3. Verwijder de `vracht_regel` (koppeling gereedmelding ↔ vracht)
4. Check of de vracht nog andere regels heeft:
   - Geen regels meer → verwijder de factuur van de vracht (via `vracht_id`), verwijder de vracht
5. Als de gereedmelding een `factuur_id` had die nog bestaat → verwijder die factuur
6. Verwijder de gereedmelding zelf

**Volgorde is belangrijk:** vracht_regel eerst, dan vracht/factuur, dan gereedmelding — zodat foreign key constraints niet botsen.

### Server action — `src/lib/actions/leveringen.ts`

De bestaande `deleteLevering` server action roept `deleteLeveringMetCascade` aan in plaats van de simpele `dbDeleteLevering`.

### UI — `src/components/leveringen/LeveringenList.tsx`

- "Verwijderen" knop altijd tonen (niet meer conditioneel op `!inFactuur`)
- Bevestigingsvraag:
  - Standaard: `'Gereedmelding verwijderen?'`
  - Als `inFactuur === true`: `'Deze gereedmelding is gekoppeld aan een factuur. De factuur en eventuele vracht worden ook verwijderd. Doorgaan?'`

## Wat niet verandert

- "Bewerken" knop blijft verborgen voor gereedmeldingen met `factuur_id`
- Vracht verwijderen werkt zoals nu — gereedmeldingen blijven intact
- `deleteLevering` (simpele versie) in `src/lib/db/leveringen.ts` blijft bestaan voor intern gebruik door de update-functie (als aantal 0 is)

## Succescriteria

- Een gereedmelding met factuur kan verwijderd worden via de UI
- Na verwijdering: geen wees-factuur, geen lege vracht
- Als de vracht nog andere gereedmeldingen heeft, blijft de vracht intact (alleen de `vracht_regel` rij is weg)
- Bevestigingsvraag maakt duidelijk wat er mee verdwijnt
