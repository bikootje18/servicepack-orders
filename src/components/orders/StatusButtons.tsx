'use client'

import { updateOrderStatus } from '@/lib/db/orders'
import { useRouter } from 'next/navigation'
import type { Order, OrderStatus } from '@/types'

const transities: Partial<Record<OrderStatus, { naar: OrderStatus; label: string }>> = {
  concept: { naar: 'bevestigd', label: 'Markeer als bevestigd' },
  bevestigd: { naar: 'in_behandeling', label: 'Start behandeling' },
}

export function StatusButtons({ order }: { order: Order }) {
  const router = useRouter()
  const transitie = transities[order.status]
  if (!transitie) return null

  async function handleStatusWijziging() {
    await updateOrderStatus(order.id, transitie!.naar)
    router.refresh()
  }

  return (
    <div className="mb-4">
      <button onClick={handleStatusWijziging}
        className="text-sm border border-blue-300 text-blue-700 px-3 py-1 rounded hover:bg-blue-50">
        {transitie.label}
      </button>
    </div>
  )
}
