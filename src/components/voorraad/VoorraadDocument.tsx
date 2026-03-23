import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { VoorraadRegel } from '@/types'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 20 },
  row: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#eee' },
  header: { fontFamily: 'Helvetica-Bold' },
})

interface Props {
  klantNaam: string
  regels: VoorraadRegel[]
  datum: string
}

export function VoorraadDocument({ klantNaam, regels, datum }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Voorraadoverzicht – {klantNaam}</Text>
        <Text style={styles.subtitle}>Per {datum}</Text>
        <View style={{ ...styles.row }}>
          <Text style={{ ...styles.header, flex: 2 }}>Order</Text>
          <Text style={{ ...styles.header, flex: 1, textAlign: 'right' }}>Totaal</Text>
          <Text style={{ ...styles.header, flex: 1, textAlign: 'right' }}>Geleverd</Text>
          <Text style={{ ...styles.header, flex: 1, textAlign: 'right' }}>Resterend</Text>
        </View>
        {regels.map(r => (
          <View key={r.order_id} style={styles.row}>
            <Text style={{ flex: 2 }}>{r.order_nummer}</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>{r.order_grootte.toLocaleString('nl-NL')}</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>{r.totaal_geleverd.toLocaleString('nl-NL')}</Text>
            <Text style={{ flex: 1, textAlign: 'right' }}>{r.resterend.toLocaleString('nl-NL')}</Text>
          </View>
        ))}
      </Page>
    </Document>
  )
}
