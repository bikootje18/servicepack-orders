'use client'

import { useRouter } from 'next/navigation'
import { verwijderOrder } from '@/lib/actions/orders'

interface Props {
  orderId: string
  orderNummer?: string
}

export function VerwijderOrderKnop({ orderId, orderNummer }: Props) {
  const router = useRouter()

  async function handleVerwijder() {
    const bevestigd = confirm(
      `Order ${orderNummer ?? ''} verwijderen? Dit kan niet ongedaan worden gemaakt.`
    )
    if (!bevestigd) return
    await verwijderOrder(orderId)
    router.push('/orders')
  }

  return (
    <button
      type="button"
      onClick={handleVerwijder}
      className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
    >
      Verwijderen
    </button>
  )
}
