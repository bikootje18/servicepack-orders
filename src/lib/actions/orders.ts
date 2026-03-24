'use server'

import { revalidatePath } from 'next/cache'
import { updateOrderStatus as dbUpdateOrderStatus } from '@/lib/db/orders'
import type { Order } from '@/types'

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  await dbUpdateOrderStatus(id, status)
  revalidatePath(`/orders/${id}`)
}
