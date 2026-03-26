# Design: Gereedmelding + Snelvracht

**Datum:** 2026-03-24

## Doel

"Levering" hernoemen naar "gereedmelding", de losse factuurknop verwijderen, en een snelknop toevoegen die in één klik gereedmelding + vracht + factuur aanmaakt.

## Wijzigingen

### 1. Labels
Overal in de UI: "levering/leveringen" → "gereedmelding/gereedmeldingen". DB en code-namen blijven `levering` — alleen tekst die de gebruiker ziet verandert.

### 2. Factuurknop weg
De "Factuur aanmaken" knop op `orders/[id]/page.tsx` wordt verwijderd. Facturen verlopen altijd via een vracht.

### 3. Snelknop: "Gereedmelden & Vracht aanmaken"
Tweede knop in het gereedmeldingsformulier. Doet in één server action:
1. Levering aanmaken (`createLevering`)
2. Vracht aanmaken met die levering (`createVracht`)
3. Factuur aanmaken (`dbCreateFactuur`)
4. Redirect naar `/vrachten/${id}/klaar`

`LeveringForm` krijgt een extra prop `klantId` (nodig voor `createVracht`).

## Geraakte bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/components/leveringen/LeveringForm.tsx` | Prop `klantId` toevoegen, tweede knop, labels |
| `src/lib/actions/leveringen.ts` | Nieuwe action `gereedmeldenEnVrachtAanmaken` |
| `src/app/(app)/orders/[id]/page.tsx` | `klantId` doorgeven aan LeveringForm, factuurknop verwijderen, labels |
