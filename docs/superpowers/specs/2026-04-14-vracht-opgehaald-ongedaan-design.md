# Vracht opgehaald ongedaan maken

**Datum:** 2026-04-14  
**Status:** Goedgekeurd

## Probleem

Als iemand per ongeluk op "Markeer als opgehaald" drukt, is er geen manier om dat terug te draaien. De vracht verdwijnt dan naar het archief en de status `opgehaald` is permanent.

## Oplossing

Een "Ongedaan maken" knop toevoegen in het archief naast de "✓ Opgehaald" status. Hiermee gaat de vracht terug naar status `aangemaakt` en verschijnt hij weer op de gewone vrachtenlijst.

## Ontwerp

### Server action — `src/lib/actions/vrachten.ts`

Nieuwe functie `markeerVrachtNietOpgehaald(id: string)`:
- Zet `status` terug naar `aangemaakt`
- Doet `revalidatePath('/vrachten')` en `revalidatePath('/vrachten/archief')`
- Redirect naar `/vrachten`

### UI — `src/app/(app)/vrachten/archief/page.tsx`

De statuskolom vervangt de statische tekst `✓ Opgehaald` door een combinatie:
- Tekst "✓ Opgehaald" blijft zichtbaar
- Naast de tekst een klein formulier met een "Ongedaan maken" knop (vergelijkbaar met de "Markeer als opgehaald" knop op de hoofdlijst)

## Wat niet verandert

- De `markeerVrachtOpgehaald` functie blijft ongewijzigd
- De hoofdvrachtenlijst (`/vrachten`) verandert niet
- Geen database-migraties nodig

## Succescriteria

- Een vracht met status `opgehaald` kan via het archief teruggedraaid worden naar `aangemaakt`
- Na de actie verschijnt de vracht weer op de gewone vrachtenlijst
- De knop is zichtbaar naast de status in het archief
