'use server'

import { zoekProductdefinities } from '@/lib/db/productdefinities'
import type { Productdefinitie } from '@/types'

export async function zoekProductdefAction(zoekterm: string): Promise<Productdefinitie[]> {
  return zoekProductdefinities(zoekterm)
}
