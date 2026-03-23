import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Factuur, Levering, Order, FacturatieCode } from '@/types'

const S = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111' },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  total: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  disclaimer: { marginTop: 32, fontSize: 8, color: '#888' },
  orderHeader: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#555', paddingVertical: 2, marginTop: 4 },
})

type LeveringMetOrder = Levering & {
  order?: Pick<Order, 'order_nummer' | 'omschrijving'> & {
    facturatie_code?: Pick<FacturatieCode, 'tarief'>
  }
}

interface Props {
  factuur: Factuur
  leveringen: LeveringMetOrder[]
  klantNaam: string
}

export function VrachtFactuurDocument({ factuur, leveringen, klantNaam }: Props) {
  // Group by order
  const groups = leveringen.reduce<Record<string, LeveringMetOrder[]>>((acc, l) => {
    const key = (l as any).order?.order_nummer ?? 'Onbekend'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.header}>
          <Text style={S.title}>Factuur {factuur.factuur_nummer}</Text>
          <Text style={S.subtitle}>{klantNaam}</Text>
          <Text style={S.subtitle}>Datum: {factuur.factuurdatum}</Text>
        </View>

        {Object.entries(groups).map(([orderNummer, regels]) => {
          const tarief = (regels[0] as any).order?.facturatie_code?.tarief ?? 0
          return (
            <View key={orderNummer}>
              <Text style={S.orderHeader}>Order: {orderNummer}</Text>
              <View style={S.row}>
                <Text style={{ fontFamily: 'Helvetica-Bold', flex: 2 }}>Leverdatum</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' }}>Eenheden</Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' }}>Bedrag</Text>
              </View>
              {regels.map(l => (
                <View key={l.id} style={S.row}>
                  <Text style={{ flex: 2 }}>{l.leverdatum}</Text>
                  <Text style={{ flex: 1, textAlign: 'right' }}>{l.aantal_geleverd.toLocaleString('nl-NL')}</Text>
                  <Text style={{ flex: 1, textAlign: 'right' }}>€ {(tarief * l.aantal_geleverd).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )
        })}

        <View style={{ ...S.total, marginTop: 12 }}>
          <Text>Totaal excl. BTW</Text>
          <Text>€ {factuur.totaal_bedrag.toFixed(2)}</Text>
        </View>

        <Text style={S.disclaimer}>
          Bedragen excl. BTW. Dit document is geen officieel belastingdocument.
        </Text>
      </Page>
    </Document>
  )
}
