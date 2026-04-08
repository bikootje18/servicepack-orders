import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Vracht } from '@/types'
import { BEDRIJF } from '@/lib/constants/bedrijf'

const S = StyleSheet.create({
  page: { padding: 20, fontFamily: 'Helvetica', fontSize: 9, color: '#111' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 8, textAlign: 'center', color: '#555', marginBottom: 10 },
  row: { flexDirection: 'row' },
  box: { border: '1pt solid #333', padding: 5, flex: 1 },
  boxLabel: { fontSize: 7, color: '#555', marginBottom: 2 },
  boxValue: { fontSize: 9 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f0f0f0', borderTop: '1pt solid #333', borderLeft: '1pt solid #333' },
  tableRow: { flexDirection: 'row', borderTop: '1pt solid #ccc', borderLeft: '1pt solid #333' },
  cell: { borderRight: '1pt solid #333', padding: '3 4', fontSize: 8 },
  cellRight: { borderRight: '1pt solid #333', padding: '3 4', fontSize: 8, textAlign: 'right' },
  signatureBox: { border: '1pt solid #333', flex: 1, height: 50, padding: 4 },
  signatureLabel: { fontSize: 7, color: '#555' },
  footer: { marginTop: 4, fontSize: 7, color: '#888', textAlign: 'center' },
})

interface VrachtRegel {
  levering: {
    id: string
    leverdatum: string
    aantal_geleverd: number
    order_id: string
    order: {
      order_nummer: string
      omschrijving: string
      aantal_per_doos: number
      aantal_per_inner: number
      aantal_per_pallet: number
      facturatie_code?: { code: string }
    }
  }
}

interface Props {
  vracht: Vracht & {
    klant: { naam: string; adres: string; postcode: string; stad: string; land: string }
    regels: VrachtRegel[]
  }
}

function verpakkingLabel(aantal: number, perDoos: number, perPallet: number): string {
  const parts: string[] = []
  if (perPallet > 0) parts.push(`${Math.ceil(aantal / perPallet)} pal`)
  if (perDoos > 0) parts.push(`${Math.ceil(aantal / perDoos)} ds`)
  return parts.join(' / ') || '–'
}

export function VrachtbriefDocument({ vracht }: Props) {
  const regels = vracht.regels ?? []
  const totaalEenheden = regels.reduce((sum, r) => sum + (r.levering?.aantal_geleverd ?? 0), 0)

  // Afleveradres: override indien opgegeven, anders klantadres
  const aflever = {
    naam:     vracht.aflever_naam     ?? vracht.klant.naam,
    adres:    vracht.aflever_adres    ?? vracht.klant.adres,
    postcode: vracht.aflever_postcode ?? vracht.klant.postcode,
    stad:     vracht.aflever_stad     ?? vracht.klant.stad,
    land:     vracht.aflever_land     ?? vracht.klant.land,
  }

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <Text style={S.title}>VRACHTBRIEF / CMR</Text>
        <Text style={S.subtitle}>
          {vracht.vrachtbrief_nummer} · {vracht.datum}
        </Text>

        {/* Top section: sender | consignee | reference */}
        <View style={S.row}>
          <View style={{ ...S.box, flex: 2 }}>
            <Text style={S.boxLabel}>1. Afzender (naam, adres, land)</Text>
            <Text style={S.boxValue}>{BEDRIJF.naam}</Text>
            <Text style={S.boxValue}>{BEDRIJF.adres}</Text>
            <Text style={S.boxValue}>{BEDRIJF.postcode} {BEDRIJF.stad}</Text>
            <Text style={S.boxValue}>{BEDRIJF.land}</Text>
          </View>
          <View style={{ ...S.box, flex: 2 }}>
            <Text style={S.boxLabel}>2. Ontvanger (naam, adres, land)</Text>
            <Text style={S.boxValue}>{aflever.naam}</Text>
            {!!aflever.adres && <Text style={S.boxValue}>{aflever.adres}</Text>}
            {!!(aflever.postcode || aflever.stad) && (
              <Text style={S.boxValue}>
                {[aflever.postcode, aflever.stad].filter(Boolean).join(' ')}
              </Text>
            )}
            {!!aflever.land && <Text style={S.boxValue}>{aflever.land}</Text>}
          </View>
          <View style={{ ...S.box, flex: 1 }}>
            <Text style={S.boxLabel}>Vrachtbrief nr.</Text>
            <Text style={{ ...S.boxValue, fontFamily: 'Helvetica-Bold' }}>{vracht.vrachtbrief_nummer}</Text>
            <Text style={{ ...S.boxLabel, marginTop: 4 }}>Datum</Text>
            <Text style={S.boxValue}>{vracht.datum}</Text>
          </View>
        </View>

        {/* Delivery place + carrier + notes */}
        <View style={S.row}>
          <View style={{ ...S.box, flex: 2 }}>
            <Text style={S.boxLabel}>3. Afleverplaats (plaats, land)</Text>
            <Text style={S.boxValue}>
              {[aflever.stad, aflever.land].filter(Boolean).join(', ') || '–'}
            </Text>
          </View>
          <View style={{ ...S.box, flex: 1 }}>
            <Text style={S.boxLabel}>8. Vervoerder</Text>
            <Text style={S.boxValue}>{BEDRIJF.naam}</Text>
          </View>
          <View style={{ ...S.box, flex: 2 }}>
            <Text style={S.boxLabel}>16. Bijzondere overeenkomsten</Text>
            <Text style={S.boxValue}>{vracht.notities || '–'}</Text>
          </View>
        </View>

        {/* Goods table */}
        <View style={{ marginTop: 6 }}>
          <View style={S.tableHeader}>
            <Text style={{ ...S.cell, flex: 2, borderBottom: '1pt solid #333' }}>Ordernummer / Omschrijving</Text>
            <Text style={{ ...S.cellRight, flex: 1, borderBottom: '1pt solid #333' }}>Eenheden</Text>
            <Text style={{ ...S.cell, flex: 1, borderBottom: '1pt solid #333' }}>Verpakking</Text>
            <Text style={{ ...S.cellRight, flex: 1, borderBottom: '1pt solid #333', borderRight: '1pt solid #333' }}>Tarief code</Text>
          </View>
          {regels.filter(r => r.levering != null).map(r => {
            const l = r.levering!
            const o = l.order!
            return (
              <View key={l.id} style={{ ...S.tableRow, borderBottom: '1pt solid #ccc' }}>
                <View style={{ ...S.cell, flex: 2 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold' }}>{o.order_nummer}</Text>
                  {o.omschrijving ? <Text style={{ fontSize: 7, color: '#555' }}>{o.omschrijving}</Text> : null}
                </View>
                <Text style={{ ...S.cellRight, flex: 1 }}>{l.aantal_geleverd.toLocaleString('nl-NL')}</Text>
                <Text style={{ ...S.cell, flex: 1 }}>
                  {verpakkingLabel(l.aantal_geleverd, o.aantal_per_doos, o.aantal_per_pallet)}
                </Text>
                <Text style={{ ...S.cellRight, flex: 1, borderRight: '1pt solid #333' }}>
                  {o.facturatie_code?.code ?? '–'}
                </Text>
              </View>
            )
          })}
          {/* Totals row */}
          <View style={{ flexDirection: 'row', borderTop: '1pt solid #333', borderLeft: '1pt solid #333' }}>
            <Text style={{ ...S.cell, flex: 2, fontFamily: 'Helvetica-Bold' }}>Totaal</Text>
            <Text style={{ ...S.cellRight, flex: 1, fontFamily: 'Helvetica-Bold', borderRight: '1pt solid #333' }}>
              {totaalEenheden.toLocaleString('nl-NL')}
            </Text>
            <Text style={{ ...S.cell, flex: 1, borderRight: '1pt solid #333' }}></Text>
            <Text style={{ ...S.cell, flex: 1, borderRight: '1pt solid #333' }}></Text>
          </View>
        </View>

        {/* Sender instructions */}
        <View style={{ ...S.box, marginTop: 6, height: 30 }}>
          <Text style={S.boxLabel}>13. Instructies afzender (douane, etc.)</Text>
        </View>

        {/* Signature row */}
        <View style={{ ...S.row, marginTop: 6 }}>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Handtekening afzender</Text>
          </View>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Handtekening vervoerder</Text>
          </View>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>Handtekening ontvanger</Text>
          </View>
        </View>

        <Text style={S.footer}>
          Dit document is opgemaakt door het Order Systeem · {new Date().toLocaleDateString('nl-NL')}
        </Text>
      </Page>
    </Document>
  )
}
