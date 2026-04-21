// scripts/import-productdefinities.ts
//
// Gebruik: npx tsx scripts/import-productdefinities.ts "Productdefinities 20260420.xlsx"
//
// Vereist env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { readFileSync } from 'fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Stel NEXT_PUBLIC_SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY in')
  process.exit(1)
}

const file = process.argv[2]
if (!file) {
  console.error('Gebruik: npx tsx scripts/import-productdefinities.ts <excel-bestand>')
  process.exit(1)
}

const supabase = createClient(url, key)

const wb = XLSX.read(readFileSync(file))
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

console.log(`${rows.length} rijen gevonden in ${file}`)

const records = rows
  .filter(r => r['Art Nr'] != null)
  .map(r => ({
    publiceren: r['Publiceren'] === 'x',
    art_nr: String(r['Art Nr']),
    omschrijving_eindproduct: String(r['Omschrijving eindproduct'] ?? ''),
    art_grondstof: String(r['Art Grondstof'] ?? ''),
    omschrijving_grondstof: String(r['Omschrijving grondstof'] ?? ''),
    grondstof_per_he: Number(r['# Grondstof / HE'] ?? 0),
    tray_1_code: String(r['Tray 1 (1x)'] ?? ''),
    tray_1_per_he: Number(r['# Tray 1 / HE'] ?? 0),
    tray_1_omschrijving: String(r['Omschrijving Tray 1'] ?? ''),
    tray_2_code: String(r['Tray 2 (3x)'] ?? ''),
    tray_2_per_he: Number(r['# Tray 2 / HE'] ?? 0),
    tray_2_omschrijving: String(r['Omschrijving Tray 2'] ?? ''),
    ean_he: String(r['EAN HE (EAN-14)'] ?? ''),
    label_1_per_he: Number(r['# Label 1 / HE'] ?? 0),
    ean_ce: String(r['EAN CE (3x) (EAN-13)'] ?? ''),
    label_2_per_he: Number(r['# Label 2 / HE'] ?? 0),
    per_laag: Number(r['# / laag'] ?? 0),
    lagen: Number(r['# lagen'] ?? 0),
    per_pallet: Number(r['# / pallet'] ?? 0),
    lading_drager: String(r['Lading drager'] ?? ''),
    tussenlegvel: r['Tussenlegvel'] === 'X',
    hoekprofiel: r['Hoekprofiel'] === 'X',
    spiegelen: r['Spiegelen'] === 'X',
    tarief_service_pack: Number(r['Totaal tarief Service Pack'] ?? 0),
  }))

console.log(`${records.length} geldige records om te importeren`)

// Upsert in batches van 50
const BATCH = 50
let imported = 0
for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH)
  const { error } = await supabase
    .from('productdefinities')
    .upsert(batch, { onConflict: 'art_nr' })
  if (error) {
    console.error(`Fout bij batch ${i}:`, error.message)
    process.exit(1)
  }
  imported += batch.length
  console.log(`${imported}/${records.length} geïmporteerd...`)
}

console.log(`Klaar! ${imported} productdefinities geïmporteerd.`)
