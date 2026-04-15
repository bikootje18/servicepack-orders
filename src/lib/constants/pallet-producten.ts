export type LosPalletType = 'chep' | 'euro' | 'dpb'

export interface PalletProduct {
  naam: string
  artikelnummer: string
  palletType: LosPalletType
  krattenPerPallet: number
}

export const PALLET_PRODUCTEN: PalletProduct[] = [
  { naam: 'Duvel 33cl',                  artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 63 },
  { naam: 'Chouffe 33cl',                artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 63 },
  { naam: 'Liefmans',                    artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Vedett 33cl',                 artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 63 },
  { naam: 'Moortgat (zwart 33cl)',       artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Maredsous 33cl',              artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 63 },
  { naam: 'De Koninck',                  artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Warsteiner 24x33/50cl',       artikelnummer: 'Krat 6',   palletType: 'euro', krattenPerPallet: 40 },
  { naam: 'Konig Ludwig 50cl',           artikelnummer: 'Krat 6',   palletType: 'euro', krattenPerPallet: 40 },
  { naam: 'Benediktiner 20x50cl',        artikelnummer: 'Krat 2',   palletType: 'euro', krattenPerPallet: 40 },
  { naam: 'Westmalle 24x33cl EIGEN',     artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 54 },
  { naam: 'Rochefort 24x33cl',           artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 54 },
  { naam: 'Zundert 24x33cl',             artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Achel 24x33cl',               artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Orval',                       artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 49 },
  { naam: 'Brugse zot 24x33cl',          artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Straffe Hendrik 24x33cl',     artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Wittekerke 25x33cl',          artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Kwaremont 24x33cl',           artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Petrus 24x33cl',              artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Wieze 24x33cl',               artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 70 },
  { naam: 'Gulpener 4x6x30cl (pinolen)', artikelnummer: 'Krat 1142',palletType: 'dpb',  krattenPerPallet: 70 },
  { naam: 'Gulpener 24x30cl',            artikelnummer: 'Krat 6',   palletType: 'dpb',  krattenPerPallet: 70 },
  { naam: 'Neubourg 24x33cl EIGEN',      artikelnummer: 'Krat 6',   palletType: 'dpb',  krattenPerPallet: 60 },
  { naam: 'Chimay',                      artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 56 },
  { naam: 'Becks',                       artikelnummer: 'Krat 6',   palletType: 'dpb',  krattenPerPallet: 60 },
  { naam: 'Antwerpse 24x33cl',           artikelnummer: 'Krat 6',   palletType: 'chep', krattenPerPallet: 56 },
  { naam: '12x37,5cl (Groene fles)',     artikelnummer: 'Krat 183', palletType: 'chep', krattenPerPallet: 84 },
  { naam: 'Gouden Carolus 24x33cl',      artikelnummer: 'Krat 10',  palletType: 'chep', krattenPerPallet: 60 },
  { naam: 'Kasseler',                    artikelnummer: 'Krat 6',   palletType: 'dpb',  krattenPerPallet: 60 },
  { naam: 'Kasteel',                     artikelnummer: 'Krat 10',  palletType: 'chep', krattenPerPallet: 56 },
]

export function losPalletLabel(type: LosPalletType): string {
  const labels: Record<LosPalletType, string> = { chep: 'Chep', euro: 'Euro', dpb: 'DPB' }
  return labels[type]
}
