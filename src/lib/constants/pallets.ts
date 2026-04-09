import type { PalletType } from '@/types'

export const PALLET_OPTIES: { value: PalletType; label: string }[] = [
  { value: 'chep',     label: 'Chep-pallet' },
  { value: 'eurochep', label: 'Eurochep-pallet' },
  { value: 'euro',     label: 'Euro-pallet' },
  { value: 'lpr',      label: 'LPR-pallet' },
  { value: 'geen',     label: 'Geen pallet' },
]

export function palletLabel(type: PalletType): string {
  return PALLET_OPTIES.find(o => o.value === type)?.label ?? type
}
