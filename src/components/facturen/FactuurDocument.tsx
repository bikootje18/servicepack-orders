import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type { Factuur, Levering } from '@/types'
import { BEDRIJF } from '@/lib/constants/bedrijf'

function mm(v: number) { return v * 2.8346 }

function formatDatum(iso: string) {
  return iso.split('-').reverse().join('-')
}

function euro(n: number, decimals = 2) {
  return '\u20ac\u00a0' + n.toLocaleString('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

const S = StyleSheet.create({
  page: {
    paddingTop: mm(18),
    paddingLeft: mm(20),
    paddingRight: mm(20),
    paddingBottom: mm(18),
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111',
  },
  topBar: {
    height: mm(2.5),
    backgroundColor: '#111',
    marginBottom: mm(7),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: mm(8),
  },
  headerLeft: {
    flex: 1,
  },
  logo: {
    width: mm(36),
    marginBottom: mm(4),
  },
  bedrijfRegel: {
    fontSize: 7.5,
    color: '#666',
    lineHeight: 1.55,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  factuurTitel: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    letterSpacing: 3,
    marginBottom: mm(4),
  },
  metaRij: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: mm(3),
    marginBottom: mm(0.5),
  },
  metaLabel: {
    fontSize: 7.5,
    color: '#888',
  },
  metaWaarde: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
    minWidth: mm(28),
    textAlign: 'right',
  },
  ruleLight: {
    height: 0.5,
    backgroundColor: '#ddd',
    marginBottom: mm(5),
  },
  sectionLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#aaa',
    letterSpacing: 1.2,
    marginBottom: mm(1.5),
  },
  klantBlok: {
    marginBottom: mm(7),
    paddingBottom: mm(5),
  },
  klantNaam: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  orderBlok: {
    backgroundColor: '#f7f7f7',
    padding: mm(4),
    marginBottom: mm(6),
  },
  orderMetaGrid: {
    flexDirection: 'row',
    gap: mm(8),
    marginBottom: mm(2),
  },
  orderMetaItem: {
    flexDirection: 'row',
    gap: mm(2),
  },
  orderMetaItemLabel: {
    fontSize: 7.5,
    color: '#888',
  },
  orderMetaItemWaarde: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111',
  },
  bewerkingRegel: {
    fontSize: 7.5,
    color: '#444',
    flexDirection: 'row',
    gap: mm(2),
  },
  tabelHeader: {
    flexDirection: 'row',
    paddingBottom: mm(1.5),
    borderBottomWidth: 0.5,
    borderBottomColor: '#bbb',
    marginBottom: mm(0.5),
  },
  tabelRij: {
    flexDirection: 'row',
    paddingVertical: mm(1.8),
    borderBottomWidth: 0.25,
    borderBottomColor: '#ebebeb',
  },
  thDatum: { flex: 3, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#888', letterSpacing: 0.5 },
  thAantal: { flex: 2, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#888', textAlign: 'right', letterSpacing: 0.5 },
  thTarief: { flex: 2.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#888', textAlign: 'right', letterSpacing: 0.5 },
  thBedrag: { flex: 2.5, fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#888', textAlign: 'right', letterSpacing: 0.5 },
  tdDatum: { flex: 3, fontSize: 8.5, color: '#222' },
  tdAantal: { flex: 2, fontSize: 8.5, textAlign: 'right', color: '#222' },
  tdTarief: { flex: 2.5, fontSize: 8.5, textAlign: 'right', color: '#555' },
  tdBedrag: { flex: 2.5, fontSize: 8.5, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#111' },
  totaalBlok: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: mm(4),
    marginTop: mm(3),
    borderTopWidth: 1.5,
    borderTopColor: '#111',
  },
  totaalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  totaalBedrag: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: mm(8),
    borderTopWidth: 0.25,
    borderTopColor: '#e0e0e0',
  },
  disclaimer: {
    fontSize: 7,
    color: '#c0c0c0',
  },
})

interface Props {
  factuur: Factuur
  leveringen: Levering[]
  klantNaam: string
  logoUrl?: string
}

export function FactuurDocument({ factuur, leveringen, klantNaam, logoUrl }: Props) {
  const order = factuur.order
  const tarief = factuur.tarief ?? 0
  const facturatieCode = (order as any)?.facturatie_code

  return (
    <Document>
      <Page size="A4" style={S.page}>

        <View style={S.topBar} />

        {/* Header */}
        <View style={S.headerRow}>
          <View style={S.headerLeft}>
            {logoUrl && <Image src={logoUrl} style={S.logo} />}
            <Text style={S.bedrijfRegel}>{BEDRIJF.naam}</Text>
            <Text style={S.bedrijfRegel}>{BEDRIJF.adres}</Text>
            <Text style={S.bedrijfRegel}>{BEDRIJF.postcode} {BEDRIJF.stad}</Text>
            <Text style={S.bedrijfRegel}>{BEDRIJF.land}</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.factuurTitel}>FACTUUR</Text>
            <View style={S.metaRij}>
              <Text style={S.metaLabel}>Nummer</Text>
              <Text style={S.metaWaarde}>{factuur.factuur_nummer}</Text>
            </View>
            <View style={S.metaRij}>
              <Text style={S.metaLabel}>Datum</Text>
              <Text style={S.metaWaarde}>{formatDatum(factuur.factuurdatum)}</Text>
            </View>
          </View>
        </View>

        <View style={S.ruleLight} />

        {/* Klant */}
        <View style={S.klantBlok}>
          <Text style={S.sectionLabel}>GEFACTUREERD AAN</Text>
          <Text style={S.klantNaam}>{klantNaam}</Text>
        </View>

        {/* Order info */}
        {order && (
          <View style={S.orderBlok}>
            <View style={S.orderMetaGrid}>
              <View style={S.orderMetaItem}>
                <Text style={S.orderMetaItemLabel}>Order</Text>
                <Text style={S.orderMetaItemWaarde}>{order.order_nummer}</Text>
              </View>
              {!!order.order_code && (
                <View style={S.orderMetaItem}>
                  <Text style={S.orderMetaItemLabel}>Artikel</Text>
                  <Text style={S.orderMetaItemWaarde}>{order.order_code}</Text>
                </View>
              )}
            </View>
            {!!order.bewerking && (
              <View style={S.bewerkingRegel}>
                <Text style={S.orderMetaItemLabel}>Bewerking</Text>
                <Text style={S.orderMetaItemWaarde}>{order.bewerking}</Text>
              </View>
            )}
          </View>
        )}

        {/* Tabel */}
        <View style={S.tabelHeader}>
          <Text style={S.thDatum}>LEVERDATUM</Text>
          <Text style={S.thAantal}>EENHEDEN</Text>
          <Text style={S.thTarief}>TARIEF</Text>
          <Text style={S.thBedrag}>BEDRAG</Text>
        </View>
        {leveringen.map(l => (
          <View key={l.id} style={S.tabelRij}>
            <Text style={S.tdDatum}>{formatDatum(l.leverdatum)}</Text>
            <Text style={S.tdAantal}>{l.aantal_geleverd.toLocaleString('nl-NL')}</Text>
            <Text style={S.tdTarief}>{euro(tarief, 4)}</Text>
            <Text style={S.tdBedrag}>{euro(tarief * l.aantal_geleverd)}</Text>
          </View>
        ))}

        {/* Totaal */}
        <View style={S.totaalBlok}>
          <Text style={S.totaalLabel}>TOTAAL EXCL. BTW</Text>
          <Text style={S.totaalBedrag}>{euro(factuur.totaal_bedrag)}</Text>
        </View>

        <View style={S.footer}>
          <Text style={S.disclaimer}>
            Bedragen excl. BTW. Dit document is geen officieel belastingdocument.
          </Text>
        </View>

      </Page>
    </Document>
  )
}
