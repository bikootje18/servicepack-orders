# Losse Pallet-CMR Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nieuwe losse flow waarmee je snel een CMR PDF genereert op basis van pallets die een chauffeur heeft geladen — zonder koppeling aan orders of klanten.

**Architecture:** Geen database. Productcatalogus als hardcoded constante. Formulier als client-component met lokale state. PDF gegenereerd client-side via `@react-pdf/renderer`, identiek aan de bestaande CMR overlay flow.

**Tech Stack:** Next.js 15 App Router, React (client component), `@react-pdf/renderer` ^4, Vitest, TypeScript

---

## Bestandsoverzicht

| Actie | Pad | Verantwoordelijkheid |
|---|---|---|
| Create | `src/lib/constants/pallet-producten.ts` | Productcatalogus + types |
| Create | `src/lib/utils/pallet-cmr.ts` | Berekeningslogica (puur, testbaar) |
| Create | `src/lib/utils/pallet-cmr.test.ts` | Unit tests voor berekeningslogica |
| Create | `src/components/cmr-pallet/LosCmrOverlayDocument.tsx` | PDF React component |
| Create | `src/components/cmr-pallet/PalletCmrForm.tsx` | Client formulier + PDF-knop |
| Create | `src/app/(app)/cmr-pallet/page.tsx` | Server component wrapper (minimalistische pagina) |
| Modify | `src/app/(app)/layout.tsx` | Link toevoegen aan navigatie |

---

### Task 1: Productcatalogus constante

**Files:**
- Create: `src/lib/constants/pallet-producten.ts`

- [ ] **Stap 1: Maak het bestand aan**

```ts
// src/lib/constants/pallet-producten.ts

export type LosPalletType = 'chep' | 'euro' | 'dpb'

export interface PalletProduct {
  naam: string
  artikelnummer: string
  palletType: LosPalletType
  krattenPerPallet: number
}

export const PALLET_PRODUCTEN: PalletProduct[] = [
  { naam: 'Duvel 33cl',                  artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 63 },
  { naam: 'Chouffe 33cl',                artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 63 },
  { naam: 'Liefmans',                    artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Vedett 33cl',                 artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 63 },
  { naam: 'Moortgat (zwart 33cl)',       artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Maredsous 33cl',              artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 63 },
  { naam: 'De Koninck',                  artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Warsteiner 24x33/50cl',       artikelnummer: 'Krat 6',   palletType: 'euro', krattenPerPallet: 40 },
  { naam: 'Konig Ludwig 50cl',           artikelnummer: 'Krat 6',   palletType: 'euro', krattenPerPallet: 40 },
  { naam: 'Benediktiner 20x50cl',        artikelnummer: 'Krat 2',   palletType: 'euro', krattenPerPallet: 40 },
  { naam: 'Westmalle 24x33cl EIGEN',     artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 54 },
  { naam: 'Rochefort 24x33cl',           artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 54 },
  { naam: 'Zundert 24x33cl',             artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Achel 24x33cl',               artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Orval',                       artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 49 },
  { naam: 'Brugse zot 24x33cl',          artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Straffe Hendrik 24x33cl',     artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Wittekerke 25x33cl',          artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Kwaremont 24x33cl',           artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Petrus 24x33cl',              artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Wieze 24x33cl',               artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Gulpener 4x6x30cl (pinolen)', artikelnummer: 'Krat 1142',palletType: 'dpb',  krattenPerPallet: 70 },
  { naam: 'Gulpener 24x30cl',            artikelnummer: 'Krat 6',   palletType: 'dpb',  krattenPerPallet: 70 },
  { naam: 'Neubourg 24x33cl EIGEN',      artikelnummer: 'Krat 6',   palletType: 'dpb',  krattenPerPallet: 60 },
  { naam: 'Chimay',                      artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 56 },
  { naam: 'Becks',                       artikelnummer: 'Krat 6',   palletType: 'dpb',  krattenPerPallet: 60 },
  { naam: 'Antwerpse 24x33cl',           artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 56 },
  { naam: '12x37,5cl (Groene fles)',     artikelnummer: 'Krat 183', palletType: 'chep', krattenPerPallet: 84 },
  { naam: 'Gouden Carolus 24x33cl',      artikelnummer: 'Krat 10',  palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Kasseler',                    artikelnummer: 'Krat 6',   palletType: 'dpb',  krattenPerPallet: 60 },
  { naam: 'Kasteel',                     artikelnummer: 'Krat 10',  palletType: 'chep', krattenPerPallet: 56 },
]

export function losPalletLabel(type: LosPalletType): string {
  const labels: Record<LosPalletType, string> = { chep: 'Chep', euro: 'Euro', dpb: 'DPB' }
  return labels[type]
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/lib/constants/pallet-producten.ts
git commit -m "feat: pallet-producten catalogus constante"
```

---

### Task 2: Berekeningslogica + tests

**Files:**
- Create: `src/lib/utils/pallet-cmr.ts`
- Create: `src/lib/utils/pallet-cmr.test.ts`

- [ ] **Stap 1: Schrijf de failing tests**

```ts
// src/lib/utils/pallet-cmr.test.ts
import { describe, it, expect } from 'vitest'
import { berekenCmrRegels, berekenPalletTotalen } from './pallet-cmr'
import type { PalletInvoerRegel } from './pallet-cmr'

describe('berekenCmrRegels', () => {
  it('volle pallets: vermenigvuldigt kratten per pallet met aantal', () => {
    const invoer: PalletInvoerRegel[] = [{
      naam: 'Duvel 33cl',
      palletType: 'chep',
      krattenPerPallet: 63,
      modus: 'pallets',
      waarde: 3,
    }]
    const [regel] = berekenCmrRegels(invoer)
    expect(regel.kratten).toBe(189)
    expect(regel.aantalPallets).toBe(3)
    expect(regel.isVollePallet).toBe(true)
  })

  it('losse kratten: gebruikt waarde direct als kratten', () => {
    const invoer: PalletInvoerRegel[] = [{
      naam: 'Liefmans',
      palletType: 'chep',
      krattenPerPallet: 70,
      modus: 'kratten',
      waarde: 29,
    }]
    const [regel] = berekenCmrRegels(invoer)
    expect(regel.kratten).toBe(29)
    expect(regel.isVollePallet).toBe(false)
  })

  it('filtert regels met waarde 0 eruit', () => {
    const invoer: PalletInvoerRegel[] = [
      { naam: 'Duvel 33cl', palletType: 'chep', krattenPerPallet: 63, modus: 'pallets', waarde: 0 },
      { naam: 'Orval',      palletType: 'chep', krattenPerPallet: 49, modus: 'pallets', waarde: 2 },
    ]
    const regels = berekenCmrRegels(invoer)
    expect(regels).toHaveLength(1)
    expect(regels[0].naam).toBe('Orval')
  })
})

describe('berekenPalletTotalen', () => {
  it('groepeert per pallettype', () => {
    const regels = [
      { naam: 'Duvel',    palletType: 'chep' as const, kratten: 189, isVollePallet: true,  aantalPallets: 3, krattenPerPallet: 63,  palletTypeLabel: 'Chep' },
      { naam: 'Liefmans', palletType: 'chep' as const, kratten: 29,  isVollePallet: false, palletTypeLabel: 'Chep' },
      { naam: 'Becks',    palletType: 'dpb'  as const, kratten: 60,  isVollePallet: true,  aantalPallets: 1, krattenPerPallet: 60,  palletTypeLabel: 'DPB' },
    ]
    const totalen = berekenPalletTotalen(regels)
    expect(totalen['Chep']).toBe(4)  // 3 volle + 1 losse pallet
    expect(totalen['DPB']).toBe(1)
  })
})
```

- [ ] **Stap 2: Voer test uit — verwacht FAIL**

```bash
cd /Users/biko/Documents/New\ Order\ System && npx vitest run src/lib/utils/pallet-cmr.test.ts
```

Verwacht: `Error: Cannot find module './pallet-cmr'`

- [ ] **Stap 3: Schrijf minimale implementatie**

```ts
// src/lib/utils/pallet-cmr.ts
import type { LosPalletType } from '@/lib/constants/pallet-producten'
import { losPalletLabel } from '@/lib/constants/pallet-producten'

export interface PalletInvoerRegel {
  naam: string
  palletType: LosPalletType
  krattenPerPallet: number
  modus: 'pallets' | 'kratten'
  waarde: number
}

export interface CmrRegel {
  naam: string
  palletType: LosPalletType
  palletTypeLabel: string
  kratten: number
  isVollePallet: boolean
  aantalPallets?: number
  krattenPerPallet?: number
}

export function berekenCmrRegels(invoer: PalletInvoerRegel[]): CmrRegel[] {
  return invoer
    .filter(r => r.waarde > 0)
    .map(r => {
      if (r.modus === 'pallets') {
        return {
          naam: r.naam,
          palletType: r.palletType,
          palletTypeLabel: losPalletLabel(r.palletType),
          kratten: r.waarde * r.krattenPerPallet,
          isVollePallet: true,
          aantalPallets: r.waarde,
          krattenPerPallet: r.krattenPerPallet,
        }
      }
      return {
        naam: r.naam,
        palletType: r.palletType,
        palletTypeLabel: losPalletLabel(r.palletType),
        kratten: r.waarde,
        isVollePallet: false,
      }
    })
}

export function berekenPalletTotalen(regels: CmrRegel[]): Record<string, number> {
  const totalen: Record<string, number> = {}
  for (const r of regels) {
    const label = r.palletTypeLabel
    const pallets = r.isVollePallet ? (r.aantalPallets ?? 1) : 1
    totalen[label] = (totalen[label] ?? 0) + pallets
  }
  return totalen
}
```

- [ ] **Stap 4: Voer test uit — verwacht PASS**

```bash
npx vitest run src/lib/utils/pallet-cmr.test.ts
```

Verwacht: alle tests groen

- [ ] **Stap 5: Commit**

```bash
git add src/lib/utils/pallet-cmr.ts src/lib/utils/pallet-cmr.test.ts
git commit -m "feat: berekenCmrRegels en berekenPalletTotalen logica"
```

---

### Task 3: PDF component `LosCmrOverlayDocument`

**Files:**
- Create: `src/components/cmr-pallet/LosCmrOverlayDocument.tsx`

Dit component heeft dezelfde opmaak en positionering als `src/components/vrachten/CmrOverlayDocument.tsx`. Kopieer de stylesheet en layout. Vervang de goederen-sectie door pallet-regels.

- [ ] **Stap 1: Maak het component aan**

```tsx
// src/components/cmr-pallet/LosCmrOverlayDocument.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { BEDRIJF } from '@/lib/constants/bedrijf'
import type { CmrRegel } from '@/lib/utils/pallet-cmr'
import { berekenPalletTotalen } from '@/lib/utils/pallet-cmr'

function mm(v: number) { return v * 2.8346 }

function formatDatum(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

const BSB = {
  naam:     'BSB',
  adres:    '',
  postcode: '',
  stad:     'Etten-Leur',
  land:     'Nederland',
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111',
    paddingTop: mm(15),
    paddingLeft: mm(20),
    paddingRight: mm(15),
    paddingBottom: mm(15),
  },
  adresBlok: { fontSize: 9, lineHeight: 1.5 },
  sectie: { marginBottom: mm(10) },
  regel: { fontSize: 9, lineHeight: 1.5 },
  regelVet: { fontSize: 9, fontFamily: 'Helvetica-Bold', lineHeight: 1.5 },
  regelVetOnder: { fontSize: 9, fontFamily: 'Helvetica-Bold', textDecoration: 'underline', lineHeight: 1.5 },
  goederenBlok: { marginBottom: mm(6) },
  totaal: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: mm(4), marginBottom: mm(30) },
  footer: { marginTop: 'auto' },
})

interface Props {
  regels: CmrRegel[]
  datum: Date
}

export function LosCmrOverlayDocument({ regels, datum }: Props) {
  const palletTotalen = berekenPalletTotalen(regels)
  const totaalPallets = Object.values(palletTotalen).reduce((s, n) => s + n, 0)
  const datumTekst = formatDatum(datum)

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* 1. Afzender */}
        <View style={{ marginBottom: mm(2) }}>
          <Text style={S.adresBlok}>{BEDRIJF.naam}{'    '}NL BIO-01</Text>
          <Text style={S.adresBlok}>{BEDRIJF.adres}</Text>
          <Text style={S.adresBlok}>{BEDRIJF.postcode} {BEDRIJF.stad}</Text>
          <Text style={S.adresBlok}>{BEDRIJF.land}</Text>
        </View>

        {/* 2. Ontvanger */}
        <View style={[S.sectie, { marginTop: mm(1.5) }]}>
          <Text style={S.regel}>{BSB.naam}</Text>
          <Text style={S.regel}>{BSB.stad}</Text>
          <Text style={S.regel}>{BSB.land}</Text>
        </View>

        {/* 3. Afleverplaats */}
        <View style={[S.sectie, { marginTop: mm(1) }]}>
          <Text style={S.regel}>{BSB.stad}, {BSB.land}</Text>
        </View>

        {/* 4. Laadplaats en datum */}
        <View style={{ marginBottom: mm(35) }}>
          <Text style={S.regel}>
            {BSB.stad}, {BSB.land}{'  '}{datumTekst}
          </Text>
        </View>

        {/* 5. Goederen */}
        {regels.map((r, i) => (
          <View key={i} style={S.goederenBlok}>
            {r.isVollePallet ? (
              <Text style={S.regel}>
                {r.naam} — {r.aantalPallets} pallet{(r.aantalPallets ?? 1) !== 1 ? 's' : ''} {r.palletTypeLabel} à {r.krattenPerPallet} kratten = {r.kratten} kratten
              </Text>
            ) : (
              <Text style={S.regel}>
                {r.naam} — {r.kratten} kratten {r.palletTypeLabel}
              </Text>
            )}
          </View>
        ))}

        {/* 6. Totaal geladen */}
        {totaalPallets > 0 && (
          <Text style={S.totaal}>
            {'Totaal geladen op   '}
            {Object.entries(palletTotalen).map(([type, n]) => `${n} ${type}${n !== 1 ? 's' : ''}`).join(' + ')}
          </Text>
        )}

        {/* 7. Footer */}
        <View style={S.footer}>
          <Text style={[S.regel, { marginBottom: mm(4) }]}>
            {BEDRIJF.stad}, {datumTekst}
          </Text>
          <Text style={S.adresBlok}>{BEDRIJF.naam}{'    '}NL BIO-01</Text>
          <Text style={S.adresBlok}>{BEDRIJF.adres}</Text>
          <Text style={S.adresBlok}>{BEDRIJF.postcode} {BEDRIJF.stad}</Text>
          <Text style={S.adresBlok}>{BEDRIJF.land}</Text>
        </View>

      </Page>
    </Document>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/cmr-pallet/LosCmrOverlayDocument.tsx
git commit -m "feat: LosCmrOverlayDocument PDF component"
```

---

### Task 4: Formulier `PalletCmrForm`

**Files:**
- Create: `src/components/cmr-pallet/PalletCmrForm.tsx`

Client component. Beheert: welke vaste producten geselecteerd zijn, invoerwaarden, modus (pallets/kratten), en handmatige rijen.

- [ ] **Stap 1: Maak het component aan**

```tsx
// src/components/cmr-pallet/PalletCmrForm.tsx
'use client'

import { useState } from 'react'
import { PALLET_PRODUCTEN, losPalletLabel } from '@/lib/constants/pallet-producten'
import type { LosPalletType } from '@/lib/constants/pallet-producten'
import { berekenCmrRegels } from '@/lib/utils/pallet-cmr'
import type { PalletInvoerRegel } from '@/lib/utils/pallet-cmr'

interface VasteRijState {
  geselecteerd: boolean
  modus: 'pallets' | 'kratten'
  waarde: string
}

interface HandmatigeRij {
  id: number
  naam: string
  palletType: LosPalletType
  krattenPerPallet: string
  modus: 'pallets' | 'kratten'
  waarde: string
}

const initVaste = (): VasteRijState[] =>
  PALLET_PRODUCTEN.map(() => ({ geselecteerd: false, modus: 'pallets', waarde: '' }))

export function PalletCmrForm() {
  const [vaste, setVaste] = useState<VasteRijState[]>(initVaste)
  const [handmatig, setHandmatig] = useState<HandmatigeRij[]>([])
  const [laden, setLaden] = useState(false)
  let nextId = 0

  function updateVaste(i: number, patch: Partial<VasteRijState>) {
    setVaste(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function voegHandmatigeRijToe() {
    setHandmatig(prev => [...prev, {
      id: Date.now() + nextId++,
      naam: '',
      palletType: 'chep',
      krattenPerPallet: '',
      modus: 'pallets',
      waarde: '',
    }])
  }

  function updateHandmatig(id: number, patch: Partial<HandmatigeRij>) {
    setHandmatig(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function verwijderHandmatig(id: number) {
    setHandmatig(prev => prev.filter(r => r.id !== id))
  }

  function bouwInvoer(): PalletInvoerRegel[] {
    const vasteRegels: PalletInvoerRegel[] = PALLET_PRODUCTEN
      .map((p, i) => ({ product: p, staat: vaste[i] }))
      .filter(({ staat }) => staat.geselecteerd && Number(staat.waarde) > 0)
      .map(({ product, staat }) => ({
        naam: product.naam,
        palletType: product.palletType,
        krattenPerPallet: product.krattenPerPallet,
        modus: staat.modus,
        waarde: Number(staat.waarde),
      }))

    const handmatigeRegels: PalletInvoerRegel[] = handmatig
      .filter(r => r.naam.trim() && Number(r.waarde) > 0)
      .map(r => ({
        naam: r.naam.trim(),
        palletType: r.palletType,
        krattenPerPallet: r.modus === 'pallets' ? Number(r.krattenPerPallet) || 1 : 1,
        modus: r.modus,
        waarde: Number(r.waarde),
      }))

    return [...vasteRegels, ...handmatigeRegels]
  }

  const heeftInvoer = bouwInvoer().length > 0

  async function handleDownload() {
    setLaden(true)
    try {
      const invoer = bouwInvoer()
      const cmrRegels = berekenCmrRegels(invoer)
      const [{ pdf }, { createElement }, { LosCmrOverlayDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./LosCmrOverlayDocument'),
      ])
      const blob = await pdf(
        createElement(LosCmrOverlayDocument, { regels: cmrRegels, datum: new Date() }) as any
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cmr-pallet-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLaden(false)
    }
  }

  return (
    <div>
      {/* Vaste producten */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs text-gray-500 font-medium">
              <th className="w-8 py-2"></th>
              <th className="text-left py-2 pr-4">Product</th>
              <th className="text-left py-2 pr-4">Pallet</th>
              <th className="text-left py-2 pr-4">Kratten/pallet</th>
              <th className="text-left py-2 pr-4">Modus</th>
              <th className="text-left py-2">Aantal</th>
            </tr>
          </thead>
          <tbody>
            {PALLET_PRODUCTEN.map((product, i) => {
              const staat = vaste[i]
              return (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${staat.geselecteerd ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-1.5">
                    <input
                      type="checkbox"
                      checked={staat.geselecteerd}
                      onChange={e => updateVaste(i, { geselecteerd: e.target.checked })}
                      className="form-checkbox"
                    />
                  </td>
                  <td className="py-1.5 pr-4">
                    <span className={staat.geselecteerd ? 'font-medium' : 'text-gray-600'}>
                      {product.naam}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">{product.artikelnummer}</span>
                  </td>
                  <td className="py-1.5 pr-4 text-gray-500">{losPalletLabel(product.palletType)}</td>
                  <td className="py-1.5 pr-4 text-gray-500 tabular-nums">{product.krattenPerPallet}</td>
                  <td className="py-1.5 pr-4">
                    {staat.geselecteerd && (
                      <select
                        value={staat.modus}
                        onChange={e => updateVaste(i, { modus: e.target.value as 'pallets' | 'kratten' })}
                        className="form-input py-0.5 text-xs"
                      >
                        <option value="pallets">Pallets</option>
                        <option value="kratten">Kratten</option>
                      </select>
                    )}
                  </td>
                  <td className="py-1.5">
                    {staat.geselecteerd && (
                      <input
                        type="number"
                        min={1}
                        value={staat.waarde}
                        onChange={e => updateVaste(i, { waarde: e.target.value })}
                        placeholder={staat.modus === 'pallets' ? 'Pallets' : 'Kratten'}
                        className="form-input w-24 tabular-nums"
                        autoFocus={staat.waarde === ''}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Handmatige rijen */}
      {handmatig.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Handmatig</p>
          <div className="space-y-2">
            {handmatig.map(rij => (
              <div key={rij.id} className="flex gap-2 items-center text-sm">
                <input
                  type="text"
                  placeholder="Productnaam"
                  value={rij.naam}
                  onChange={e => updateHandmatig(rij.id, { naam: e.target.value })}
                  className="form-input flex-1"
                />
                <select
                  value={rij.palletType}
                  onChange={e => updateHandmatig(rij.id, { palletType: e.target.value as LosPalletType })}
                  className="form-input w-24"
                >
                  <option value="chep">Chep</option>
                  <option value="euro">Euro</option>
                  <option value="dpb">DPB</option>
                </select>
                <select
                  value={rij.modus}
                  onChange={e => updateHandmatig(rij.id, { modus: e.target.value as 'pallets' | 'kratten' })}
                  className="form-input w-24"
                >
                  <option value="pallets">Pallets</option>
                  <option value="kratten">Kratten</option>
                </select>
                {rij.modus === 'pallets' && (
                  <input
                    type="number"
                    min={1}
                    placeholder="Kratten/pallet"
                    value={rij.krattenPerPallet}
                    onChange={e => updateHandmatig(rij.id, { krattenPerPallet: e.target.value })}
                    className="form-input w-28"
                  />
                )}
                <input
                  type="number"
                  min={1}
                  placeholder={rij.modus === 'pallets' ? 'Pallets' : 'Kratten'}
                  value={rij.waarde}
                  onChange={e => updateHandmatig(rij.id, { waarde: e.target.value })}
                  className="form-input w-24"
                />
                <button
                  type="button"
                  onClick={() => verwijderHandmatig(rij.id)}
                  className="text-gray-400 hover:text-red-500 text-xs px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acties */}
      <div className="flex gap-3 items-center mt-4">
        <button
          type="button"
          onClick={voegHandmatigeRijToe}
          className="text-sm border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 text-gray-600"
        >
          + Voeg toe
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!heeftInvoer || laden}
          className="btn-primary px-5 disabled:opacity-40"
        >
          {laden ? 'PDF laden...' : 'CMR downloaden'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/cmr-pallet/PalletCmrForm.tsx
git commit -m "feat: PalletCmrForm client component"
```

---

### Task 5: Pagina + navigatie

**Files:**
- Create: `src/app/(app)/cmr-pallet/page.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Stap 1: Maak de pagina aan**

```tsx
// src/app/(app)/cmr-pallet/page.tsx
import { PalletCmrForm } from '@/components/cmr-pallet/PalletCmrForm'

export default function PalletCmrPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Pallet-CMR</h1>
        <p className="text-gray-500 text-sm">Selecteer de pallets die de chauffeur heeft geladen en genereer een CMR overlay.</p>
      </div>
      <PalletCmrForm />
    </div>
  )
}
```

- [ ] **Stap 2: Voeg link toe aan navigatie in `src/app/(app)/layout.tsx`**

Zoek de `nav` array (regel ~6) en voeg een item toe:

```ts
const nav = [
  { href: '/dashboard',   label: 'Dashboard' },
  { href: '/orders',      label: 'Orders' },
  { href: '/vrachten',    label: 'Vrachten' },
  { href: '/cmr-pallet',  label: 'Pallet-CMR' },
  { href: '/voorraad',    label: 'Voorraad' },
]
```

- [ ] **Stap 3: Start de dev server en test handmatig**

```bash
npm run dev
```

Ga naar `http://localhost:3000/cmr-pallet`. Controleer:
- De productlijst van 31 producten is zichtbaar
- Selectievakje activeren toont modus-dropdown en invoerveld
- Modus "Pallets" → invoerveld met label "Pallets"
- Modus "Kratten" → invoerveld met label "Kratten"
- "+ Voeg toe" voegt een lege handmatige rij toe
- "CMR downloaden" is disabled zonder invoer, enabled zodra iets ingevuld
- PDF wordt gedownload en bevat de juiste regels

- [ ] **Stap 4: Commit**

```bash
git add src/app/\(app\)/cmr-pallet/page.tsx src/app/\(app\)/layout.tsx
git commit -m "feat: cmr-pallet pagina en navigatielink"
```
