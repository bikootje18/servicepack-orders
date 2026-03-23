import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Factuur, Levering } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#111' },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#555' },
  section: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  total: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, fontFamily: 'Helvetica-Bold', fontSize: 11 },
  disclaimer: { marginTop: 32, fontSize: 8, color: '#888' },
})

interface Props {
  factuur: Factuur
  leveringen: Levering[]
  klantNaam: string
}

export function FactuurDocument({ factuur, leveringen, klantNaam }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Factuur {factuur.factuur_nummer}</Text>
          <Text style={styles.subtitle}>{klantNaam}</Text>
          <Text style={styles.subtitle}>Datum: {factuur.factuurdatum}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Leverdatum</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Eenheden</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Tarief</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>Bedrag</Text>
          </View>
          {leveringen.map(l => (
            <View key={l.id} style={styles.row}>
              <Text>{l.leverdatum}</Text>
              <Text>{l.aantal_geleverd.toLocaleString('nl-NL')}</Text>
              <Text>€ {factuur.tarief.toFixed(4)}</Text>
              <Text>€ {(factuur.tarief * l.aantal_geleverd).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.total}>
          <Text>Totaal excl. BTW</Text>
          <Text>€ {factuur.totaal_bedrag.toFixed(2)}</Text>
        </View>

        <Text style={styles.disclaimer}>
          Bedragen excl. BTW. Dit document is geen officieel belastingdocument.
        </Text>
      </Page>
    </Document>
  )
}
