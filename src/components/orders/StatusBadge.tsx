import type { OrderStatus } from '@/types'

const config: Record<OrderStatus, { bg: string; text: string; dot: string; label: string }> = {
  concept:       { bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400',   label: 'Concept' },
  bevestigd:     { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-400',   label: 'Bevestigd' },
  in_behandeling:{ bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-400',  label: 'In behandeling' },
  geleverd:      { bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-400',label: 'Geleverd' },
  gefactureerd:  { bg: 'bg-violet-50',  text: 'text-violet-700', dot: 'bg-violet-400', label: 'Gefactureerd' },
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { bg, text, dot, label } = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  )
}
