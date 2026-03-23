import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Factuur, Levering, Order, FacturatieCode } from '@/types'
import { formatDate } from '@/lib/utils/formatters'

const S = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111' },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  total: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  disclaimer: { marginTop: 32, fontSize: 8, color: '#888' },
  orderHeader: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#555', paddingVertical: 2, marginTop: 4 },
  colLabel1: { fontFamily: 'Helvetica-Bold', flex: 2 },
  colLabel2: { fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' as const },
  cell1: { flex: 2 },
  cell2: { flex: 1, textAlign: 'right' as const },
  totalSection: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 4, fontFamily: 'Helvetica-Bold', fontSize: 11, marginTop: 12 },
})

export type LeveringMetOrder = Levering & {
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
          <Text style={S.subtitle}>Datum: {formatDate(factuur.factuurdatum)}</Text>
        </View>

        {Object.entries(groups).map(([orderNummer, regels]) => {
          // tarief is taken from the first levering in the group; all leveringen within
          // an order share the same facturatie_code (it's an order-level property).
          // Falls back to 0 if the join is missing — this would produce a €0 line.
          const tarief = (regels[0] as any).order?.facturatie_code?.tarief ?? 0
          return (
            <View key={orderNummer}>
              <Text style={S.orderHeader}>Order: {orderNummer}</Text>
              <View style={S.row}>
                <Text style={S.colLabel1}>Leverdatum</Text>
                <Text style={S.colLabel2}>Eenheden</Text>
                <Text style={S.colLabel2}>Bedrag</Text>
              </View>
              {regels.map(l => (
                <View key={l.id} style={S.row}>
                  <Text style={S.cell1}>{l.leverdatum}</Text>
                  <Text style={S.cell2}>{l.aantal_geleverd.toLocaleString('nl-NL')}</Text>
                  <Text style={S.cell2}>€ {(tarief * l.aantal_geleverd).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )
        })}

        <View style={S.totalSection}>
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
