export type OrderStatus = 'concept' | 'bevestigd' | 'in_behandeling' | 'geleverd' | 'gefactureerd'
export type PalletType = 'chep' | 'eurochep' | 'euro' | 'lpr' | 'geen'
export type FactuurStatus = 'concept' | 'verzonden' | 'betaald'

export interface Klant {
  id: string
  naam: string
  adres: string
  postcode: string
  stad: string
  land: string
  email: string | null
  aangemaakt_op: string
}

export interface FacturatieCode {
  id: string
  code: string
  omschrijving: string
  tarief: number
  actief: boolean
  aangemaakt_op: string
}

export interface Profiel {
  id: string
  naam: string
  email: string
}

export interface Order {
  id: string
  order_nummer: string
  order_code: string
  klant_id: string
  facturatie_code_id: string | null
  order_grootte: number
  aantal_per_doos: number
  aantal_per_inner: number
  aantal_per_pallet: number
  bewerking: string
  opwerken: boolean
  bio: boolean
  omschrijving: string
  status: OrderStatus
  aangemaakt_door: string | null
  aangemaakt_op: string
  locatie: string | null
  deadline: string | null
  tht: string | null
  pallet_type: PalletType
  // Joins
  klant?: Klant
  facturatie_code?: FacturatieCode
}

export interface Levering {
  id: string
  order_id: string
  factuur_id: string | null
  aantal_geleverd: number
  leverdatum: string
  notities: string
  aangemaakt_door: string | null
  aangemaakt_op: string
  tht: string | null
}

export interface Factuur {
  id: string
  factuur_nummer: string
  order_id: string | null      // null for vracht facturen
  vracht_id: string | null     // set for vracht facturen
  totaal_eenheden: number
  tarief: number | null        // null for vracht facturen with mixed tarifeven
  totaal_bedrag: number
  status: FactuurStatus
  factuurdatum: string
  aangemaakt_door: string | null
  aangemaakt_op: string
  // Joins
  order?: Order
  vracht?: Vracht
}

export interface VoorraadRegel {
  order_id: string
  order_nummer: string
  klant_naam: string
  order_grootte: number
  totaal_geleverd: number
  resterend: number
}

export interface Vracht {
  id: string
  klant_id: string
  vrachtbrief_nummer: string
  datum: string
  status: 'aangemaakt' | 'opgehaald'
  notities: string
  aangemaakt_op: string
  aflever_naam:     string | null
  aflever_adres:    string | null
  aflever_postcode: string | null
  aflever_stad:     string | null
  aflever_land:     string | null
  aangemaakt_door:  string | null
  // Joins
  klant?: Klant
  regels?: VrachtRegel[]
  factuur?: Pick<Factuur, 'id' | 'factuur_nummer' | 'status' | 'totaal_bedrag'>
}

export interface OrderBijlage {
  id: string
  order_id: string
  bestandsnaam: string
  opslag_pad: string
  bestandsgrootte: number | null
  mime_type: string | null
  aangemaakt_op: string
  url?: string // signed URL, server-side only
}

export interface OrderArtikel {
  id: string
  order_id: string
  naam: string
  berekening_type: 'delen' | 'vermenigvuldigen'
  factor: number
  volgorde: number
  aangemaakt_op: string
}

export interface VrachtRegel {
  id: string
  vracht_id: string
  levering_id: string
  cmr_notitie: string | null
  // Joins
  levering?: Levering & {
    order?: Order & {
      facturatie_code?: FacturatieCode
    }
  }
}

export interface GiveXImport {
  id: string
  klant_id: string
  documentnummer: string
  instructie_code: string
  leverdatum: string | null
  totaal_hoeveelheid: number
  totaal_rollen: number | null
  heeft_rollen: boolean
  order_id: string | null
  aangemaakt_op: string
  // Joins
  order?: Pick<Order, 'id' | 'order_nummer' | 'order_code'>
}
