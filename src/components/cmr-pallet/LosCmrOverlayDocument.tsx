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
