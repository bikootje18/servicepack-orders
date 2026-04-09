'use client'

import { updateOrderStatus } from '@/lib/actions/orders'
import { useRouter } from 'next/navigation'
import type { Order, OrderStatus } from '@/types'

const transities: Partial<Record<OrderStatus, { naar: OrderStatus; label: string; variant?: 'primary' | 'green' }>> = {
  bevestigd:      { naar: 'in_behandeling', label: 'Start behandeling' },
  in_behandeling: { naar: 'geleverd',       label: 'Markeer als geleverd', variant: 'green' },
}

export function StatusButtons({ order }: { order: Order }) {
  const router = useRouter()
  const transitie = transities[order.status]
  if (!transitie) return null

  async function handleStatusWijziging() {
    await updateOrderStatus(order.id, transitie!.naar)
    router.refresh()
  }

  const knopKlasse = transitie.variant === 'green'
    ? 'text-sm border border-green-300 text-green-700 px-3 py-1 rounded hover:bg-green-50'
    : 'text-sm border border-blue-300 text-blue-700 px-3 py-1 rounded hover:bg-blue-50'

  return (
    <div className="mb-4">
      <button onClick={handleStatusWijziging} className={knopKlasse}>
        {transitie.label}
      </button>
    </div>
  )
}
