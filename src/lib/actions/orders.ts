'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { updateOrderStatus as dbUpdateOrderStatus, deleteOrder as dbDeleteOrder, splitsOrder as dbSplitsOrder } from '@/lib/db/orders'
import type { Order } from '@/types'

export async function updateOrderStatus(id: string, status: Order['status']): Promise<void> {
  await dbUpdateOrderStatus(id, status)
  revalidatePath(`/orders/${id}`)
}

export async function verwijderOrder(id: string): Promise<void> {
  await dbDeleteOrder(id)
  revalidatePath('/orders')
}

export async function splitsOrderAction(id: string, formData: FormData): Promise<void> {
  const aantalRaw = formData.get('aantal') as string
  const locatie = formData.get('locatie') as string
  const aantal = parseInt(aantalRaw, 10)

  if (!aantal || aantal <= 0 || !locatie) return

  const nieuw = await dbSplitsOrder(id, { aantal, locatie })
  revalidatePath(`/orders/${id}`)
  revalidatePath('/orders')
  revalidatePath('/dashboard')
  redirect(`/orders/${nieuw.id}`)
}
