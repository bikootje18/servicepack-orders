'use server'

import { deleteCode } from '@/lib/db/codes'
import { revalidatePath } from 'next/cache'

export async function deleteCodeAction(formData: FormData) {
  await deleteCode(formData.get('id') as string)
  revalidatePath('/codes')
}
