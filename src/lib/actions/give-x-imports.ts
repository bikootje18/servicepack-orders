'use server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { parseGiveXRows } from '@/lib/utils/give-x-parser'
import { saveGiveXImport } from '@/lib/db/give-x-imports'
import { revalidatePath } from 'next/cache'

export interface ImportResultaat {
  bestandsnaam: string
  status: 'gematcht' | 'niet_gevonden' | 'al_verwerkt' | 'fout'
  instructie_code?: string
  order_nummer?: string
  foutmelding?: string
}

async function bestandNaarRijen(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })
}

async function vindOrder(klantId: string, instructieCode: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('id, order_nummer, order_code')
    .eq('klant_id', klantId)
    .eq('order_code', instructieCode)
    .order('aangemaakt_op', { ascending: false })
    .maybeSingle()
  return data
}

export async function verwerkGiveXImports(
  klantId: string,
  formData: FormData
): Promise<ImportResultaat[]> {
  const bestanden = formData.getAll('bestanden') as File[]
  const resultaten: ImportResultaat[] = []

  for (const bestand of bestanden) {
    try {
      const rijen = await bestandNaarRijen(bestand)
      const parsed = parseGiveXRows(rijen, bestand.name)

      const order = await vindOrder(klantId, parsed.instructie_code)

      await saveGiveXImport({
        klant_id: klantId,
        documentnummer: parsed.documentnummer,
        instructie_code: parsed.instructie_code,
        leverdatum: parsed.leverdatum ? parsed.leverdatum.toISOString().split('T')[0] : null,
        totaal_hoeveelheid: parsed.totaal_hoeveelheid,
        totaal_rollen: parsed.totaal_rollen,
        heeft_rollen: parsed.heeft_rollen,
        order_id: order?.id ?? null,
      })

      resultaten.push({
        bestandsnaam: bestand.name,
        status: order ? 'gematcht' : 'niet_gevonden',
        instructie_code: parsed.instructie_code,
        order_nummer: order?.order_nummer,
      })
    } catch (err) {
      const fout = err as Error
      // Duplicate documentnummer → al verwerkt
      if ((fout as { code?: string }).code === '23505') {
        resultaten.push({ bestandsnaam: bestand.name, status: 'al_verwerkt' })
      } else {
        resultaten.push({ bestandsnaam: bestand.name, status: 'fout', foutmelding: fout.message })
      }
    }
  }

  revalidatePath(`/klanten/${klantId}`)
  return resultaten
}
