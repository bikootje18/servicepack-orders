import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { Vracht } from '@/types'
import { BEDRIJF } from '@/lib/constants/bedrijf'
import { palletLabel } from '@/lib/constants/pallets'

function mm(v: number) { return v * 2.8346 }

function formatDatum(iso: string) {
  return iso.split('-').reverse().join('.')
}

function nl(n: number) {
  return n.toLocaleString('nl-NL')
}

interface VerpakkingRegel {
  label: string
  subtotaal: number
  isLos: boolean
}

function berekenVerpakkingRegels(
  aantal: number,
  perPallet: number,
  perInner: number,
  perDoos: number,
): VerpakkingRegel[] {
  const regels: VerpakkingRegel[] = []
  let rest = aantal

  if (perPallet > 0) {
    const vollePallets = Math.floor(rest / perPallet)
    if (vollePallets > 0) {
      regels.push({ label: `${vollePallets} pallet${vollePallets !== 1 ? 's' : ''} a ${nl(perPallet)}`, subtotaal: vollePallets * perPallet, isLos: false })
      rest -= vollePallets * perPallet
    }
  }

  if (perInner > 0 && rest > 0) {
    const volleInners = Math.floor(rest / perInner)
    if (volleInners > 0) {
      regels.push({ label: `${volleInners} inner${volleInners !== 1 ? 's' : ''} a ${nl(perInner)}`, subtotaal: volleInners * perInner, isLos: false })
      rest -= volleInners * perInner
    }
  }

  if (perDoos > 0 && rest > 0) {
    const volleDozen = Math.floor(rest / perDoos)
    if (volleDozen > 0) {
      regels.push({ label: `${volleDozen} ${volleDozen !== 1 ? 'dozen' : 'doos'} a ${nl(perDoos)}`, subtotaal: volleDozen * perDoos, isLos: false })
      rest -= volleDozen * perDoos
    }
  }

  if (rest > 0) {
    regels.push({ label: `${nl(rest)} los`, subtotaal: rest, isLos: true })
  }

  return regels
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
  header: {
    marginBottom: mm(2),
  },
  adresBlok: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  vrachtbriefNr: {
    position: 'absolute',
    top: mm(15),
    left: mm(158),
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  sectie: {
    marginBottom: mm(10),
  },
  regel: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  regelVet: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.5,
  },
  regelVetOnder: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'underline',
    lineHeight: 1.5,
  },
  goederenBlok: {
    marginBottom: mm(6),
  },
  totaal: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginTop: mm(4),
    marginBottom: mm(30),
  },
  footer: {
    marginTop: 'auto',
  },
})

interface VrachtRegel {
  id: string
  cmr_notitie: string | null
  levering: {
    id: string
    leverdatum: string
    aantal_geleverd: number
    tht: string | null
    order_id: string
    order: {
      order_nummer: string
      order_code: string
      omschrijving: string
      aantal_per_doos: number
      aantal_per_inner: number
      aantal_per_pallet: number
      pallet_type: string
      bio: boolean
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

export function CmrOverlayDocument({ vracht }: Props) {
  const regels = (vracht.regels ?? []).filter(r => r.levering != null)

  const aflever = {
    naam:     vracht.aflever_naam     ?? vracht.klant.naam,
    adres:    vracht.aflever_adres    ?? vracht.klant.adres,
    postcode: vracht.aflever_postcode ?? vracht.klant.postcode,
    stad:     vracht.aflever_stad     ?? vracht.klant.stad,
    land:     vracht.aflever_land     ?? vracht.klant.land,
  }

  // Totaal pallets gegroepeerd per pallettype
  const palletTotalen: Record<string, number> = {}
  for (const r of regels) {
    const per = r.levering?.order?.aantal_per_pallet ?? 0
    if (per <= 0) continue
    const type = palletLabel((r.levering?.order?.pallet_type ?? 'chep') as any)
    const aantal = Math.ceil((r.levering?.aantal_geleverd ?? 0) / per)
    palletTotalen[type] = (palletTotalen[type] ?? 0) + aantal
  }
  const totaalPallets = Object.values(palletTotalen).reduce((s, n) => s + n, 0)

  const aantalRegels = regels.length
  const goederenFont = aantalRegels <= 3 ? 9 : aantalRegels <= 6 ? 8 : aantalRegels <= 10 ? 7 : 6

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* Vrachtbrief nummer */}
        <Text style={S.vrachtbriefNr}>{vracht.vrachtbrief_nummer}</Text>

        {/* 1. Afzender */}
        <View style={S.header}>
          <Text style={S.adresBlok}>{BEDRIJF.naam}{'    '}NL BIO-01</Text>
          <Text style={S.adresBlok}>{BEDRIJF.adres}</Text>
          <Text style={S.adresBlok}>{BEDRIJF.postcode} {BEDRIJF.stad}</Text>
          <Text style={S.adresBlok}>{BEDRIJF.land}</Text>
        </View>

        {/* Ontvanger */}
        <View style={[S.sectie, { marginTop: mm(1.5) }]}>
          <Text style={S.regel}>{aflever.naam}</Text>
          {!!aflever.adres && <Text style={S.regel}>{aflever.adres}</Text>}
          {!!(aflever.postcode || aflever.stad) && (
            <Text style={S.regel}>{[aflever.postcode, aflever.stad].filter(Boolean).join(' ')}</Text>
          )}
          {!!aflever.land && <Text style={S.regel}>{aflever.land}</Text>}
        </View>

        {/* Afleverplaats */}
        <View style={[S.sectie, { marginTop: mm(1) }]}>
          <Text style={S.regel}>{[aflever.stad, aflever.land].filter(Boolean).join(', ')}</Text>
        </View>

        {/* Laadplaats en datum */}
        <View style={{ marginBottom: mm(35) }}>
          <Text style={S.regel}>
            {aflever.stad}, {aflever.land}{'  '}{formatDatum(vracht.datum)}
          </Text>
        </View>

        {/* Goederen */}
        {regels.map((r) => {
          const l = r.levering!
          const o = l.order

          if (r.cmr_notitie) {
            return (
              <View key={l.id} style={[S.goederenBlok, { marginBottom: mm(aantalRegels > 5 ? 2 : 6) }]}>
                <Text style={[S.regelVetOnder, { fontSize: goederenFont }]}>Order: {o.order_nummer}</Text>
                {!!o.order_code && <Text style={[S.regel, { fontSize: goederenFont }]}>{o.order_code}</Text>}
                {r.cmr_notitie.split('\n').map((line, i) => (
                  <Text key={i} style={[S.regel, { fontSize: goederenFont }]}>{line}</Text>
                ))}
              </View>
            )
          }

          const thtTekst = l.tht ? `   THT ${formatDatum(l.tht)}` : ''
          const verpRegels = berekenVerpakkingRegels(
            l.aantal_geleverd,
            o.aantal_per_pallet,
            o.aantal_per_inner,
            o.aantal_per_doos,
          )
          const heeftMeerdereRegels = verpRegels.length > 1

          return (
            <View key={l.id} style={[S.goederenBlok, { marginBottom: mm(aantalRegels > 5 ? 2 : 6) }]}>
              <Text style={[S.regelVetOnder, { fontSize: goederenFont }]}>Order: {o.order_nummer}</Text>
              {!!o.order_code && <Text style={[S.regel, { fontSize: goederenFont }]}>{o.order_code}</Text>}
              {verpRegels.map((vr, i) => (
                <Text key={i} style={[S.regel, { fontSize: goederenFont }]}>
                  {vr.isLos
                    ? `${vr.label}${thtTekst}`
                    : `${vr.label} = ${nl(vr.subtotaal)} verpakkingen${thtTekst}`}
                </Text>
              ))}
              {heeftMeerdereRegels && (
                <Text style={[S.regelVet, { fontSize: goederenFont }]}>
                  Totaal: {nl(l.aantal_geleverd)} verpakkingen
                </Text>
              )}
            </View>
          )
        })}

        {/* Totaal geladen */}
        {totaalPallets > 0 && (
          <Text style={[S.totaal, { fontSize: goederenFont }]}>
            {'Totaal geladen op   '}
            {Object.entries(palletTotalen).map(([type, n]) => `${n} ${type}${n !== 1 ? 's' : ''}`).join(' + ')}
          </Text>
        )}

        {/* Footer */}
        <View style={S.footer}>
          <Text style={[S.regel, { marginBottom: mm(4) }]}>
            {BEDRIJF.stad}, {formatDatum(vracht.datum)}
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
