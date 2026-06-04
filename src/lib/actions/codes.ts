'use server'

import { deleteCode, updateCode, toggleCodeActief } from '@/lib/db/codes'
import { revalidatePath } from 'next/cache'

export async function deleteCodeAction(formData: FormData) {
  await deleteCode(formData.get('id') as string)
  revalidatePath('/codes')
}

export async function updateCodeAction(formData: FormData) {
  await updateCode(formData.get('id') as string, {
    omschrijving: formData.get('omschrijving') as string,
    tarief: parseFloat(formData.get('tarief') as string),
  })
  revalidatePath('/codes')
}

export async function toggleCodeActiefAction(formData: FormData) {
  await toggleCodeActief(
    formData.get('id') as string,
    formData.get('actief') === 'true',
  )
  revalidatePath('/codes')
}
