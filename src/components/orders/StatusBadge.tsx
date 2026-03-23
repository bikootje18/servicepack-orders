import type { OrderStatus } from '@/types'

const kleuren: Record<OrderStatus, string> = {
  concept: 'bg-gray-100 text-gray-700',
  bevestigd: 'bg-blue-100 text-blue-700',
  in_behandeling: 'bg-yellow-100 text-yellow-700',
  geleverd: 'bg-green-100 text-green-700',
  gefactureerd: 'bg-purple-100 text-purple-700',
}

const labels: Record<OrderStatus, string> = {
  concept: 'Concept',
  bevestigd: 'Bevestigd',
  in_behandeling: 'In behandeling',
  geleverd: 'Geleverd',
  gefactureerd: 'Gefactureerd',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${kleuren[status]}`}>
      {labels[status]}
    </span>
  )
}
