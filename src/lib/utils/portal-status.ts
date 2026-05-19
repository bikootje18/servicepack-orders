import type { OrderStatus } from '@/types'

const LABELS: Record<OrderStatus, string> = {
  concept: 'Concept',
  bevestigd: 'Bevestigd',
  in_behandeling: 'In behandeling',
  geleverd: 'Geleverd',
  gefactureerd: 'Gefactureerd',
}

const KLEUREN: Record<OrderStatus, string> = {
  concept: 'bg-gray-100 text-gray-600',
  bevestigd: 'bg-blue-50 text-blue-700',
  in_behandeling: 'bg-amber-50 text-amber-700',
  geleverd: 'bg-green-50 text-green-700',
  gefactureerd: 'bg-purple-50 text-purple-700',
}

export function statusLabel(status: OrderStatus): string {
  return LABELS[status]
}

export function statusKleurKlasse(status: OrderStatus): string {
  return KLEUREN[status]
}
