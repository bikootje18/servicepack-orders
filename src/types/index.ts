export type OrderStatus = 'concept' | 'bevestigd' | 'in_behandeling' | 'geleverd' | 'gefactureerd'
export type FactuurStatus = 'concept' | 'verzonden' | 'betaald'

export interface Klant {
  id: string
  naam: string
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
  facturatie_code_id: string
  order_grootte: number
  aantal_per_doos: number
  aantal_per_inner: number
  aantal_per_pallet: number
  bewerking: string
  opwerken: boolean
  omschrijving: string
  status: OrderStatus
  aangemaakt_door: string | null
  aangemaakt_op: string
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
}

export interface Factuur {
  id: string
  factuur_nummer: string
  order_id: string
  totaal_eenheden: number
  tarief: number
  totaal_bedrag: number
  status: FactuurStatus
  factuurdatum: string
  aangemaakt_door: string | null
  aangemaakt_op: string
  // Joins
  order?: Order
}

export interface VoorraadRegel {
  order_id: string
  order_nummer: string
  klant_naam: string
  order_grootte: number
  totaal_geleverd: number
  resterend: number
}
