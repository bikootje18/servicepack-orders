'use server'

import { updateOrderStatus as dbUpdateOrderStatus } from '@/lib/db/orders'
import type { Order } from '@/types'

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  return dbUpdateOrderStatus(id, status)
}
