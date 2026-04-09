'use server'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { parseGiveXRows } from '@/lib/utils/give-x-parser'
import { saveGiveXImport } from '@/lib/db/give-x-imports'
import { createOrder } from '@/lib/db/orders'
import { getArtikelenVoorOrder, saveArtikelen } from '@/lib/db/artikelen'
import { revalidatePath } from 'next/cache'

export interface ImportResultaat {
  bestandsnaam: string
  status: 'aangemaakt' | 'geen_template' | 'al_verwerkt' | 'fout'
  instructie_code?: string
  order_nummer?: string
  foutmelding?: string
}

async function bestandNaarRijen(file: File): Promise<string[][]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
  return raw.map(row => (row as unknown[]).map(cel => (cel == null ? '' : String(cel))))
}

async function vindTemplateOrder(klantId: string, orderCode: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('klant_id', klantId)
    .eq('order_code', orderCode)
    .order('aangemaakt_op', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

async function isAlVerwerkt(documentnummer: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('give_x_imports')
    .select('id')
    .eq('documentnummer', documentnummer)
    .maybeSingle()
  return !!data
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

      if (await isAlVerwerkt(parsed.documentnummer)) {
        resultaten.push({ bestandsnaam: bestand.name, status: 'al_verwerkt' })
        continue
      }

      const template = await vindTemplateOrder(klantId, parsed.instructie_code)

      if (!template) {
        resultaten.push({
          bestandsnaam: bestand.name,
          status: 'geen_template',
          instructie_code: parsed.instructie_code,
        })
        continue
      }

      const nieuwOrder = await createOrder({
        order_nummer: parsed.documentnummer,
        order_code: template.order_code,
        klant_id: template.klant_id,
        facturatie_code_id: template.facturatie_code_id,
        order_grootte: parsed.totaal_hoeveelheid,
        aantal_per_doos: template.aantal_per_doos,
        aantal_per_inner: template.aantal_per_inner,
        aantal_per_pallet: template.aantal_per_pallet,
        bewerking: template.bewerking,
        opwerken: template.opwerken,
        bio: template.bio,
        omschrijving: template.omschrijving,
        locatie: template.locatie,
        deadline: parsed.leverdatum ? parsed.leverdatum.toISOString().split('T')[0] : null,
        tht: null,
        pallet_type: template.pallet_type ?? 'chep',
        aangemaakt_door: null,
      })

      const templateArtikelen = await getArtikelenVoorOrder(template.id)
      if (templateArtikelen.length > 0) {
        await saveArtikelen(nieuwOrder.id, templateArtikelen.map(a => ({
          naam: a.naam,
          berekening_type: a.berekening_type,
          factor: a.factor,
        })))
      }

      await saveGiveXImport({
        klant_id: klantId,
        documentnummer: parsed.documentnummer,
        instructie_code: parsed.instructie_code,
        leverdatum: parsed.leverdatum ? parsed.leverdatum.toISOString().split('T')[0] : null,
        totaal_hoeveelheid: parsed.totaal_hoeveelheid,
        totaal_rollen: parsed.totaal_rollen,
        heeft_rollen: parsed.heeft_rollen,
        order_id: nieuwOrder.id,
      })

      resultaten.push({
        bestandsnaam: bestand.name,
        status: 'aangemaakt',
        instructie_code: parsed.instructie_code,
        order_nummer: nieuwOrder.order_nummer,
      })
    } catch (err) {
      const fout = err as Error
      resultaten.push({ bestandsnaam: bestand.name, status: 'fout', foutmelding: fout.message })
    }
  }

  revalidatePath(`/klanten/${klantId}`)
  revalidatePath('/orders')
  return resultaten
}
