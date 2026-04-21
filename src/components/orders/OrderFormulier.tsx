'use client'

import { useActionState, useState } from 'react'
import { ArtikelenForm } from './ArtikelenForm'
import { ProductLookup } from './ProductLookup'
import type { ProductLookupResult } from './ProductLookup'
import { LOCATIES } from '@/lib/constants/locaties'
import { PALLET_OPTIES } from '@/lib/constants/pallets'
import type { Klant, FacturatieCode, OrderArtikel } from '@/types'

export interface OrderDefaultValues {
  order_nummer?: string
  order_code?: string
  klant_id?: string
  facturatie_code_code?: string
  order_grootte?: number
  locatie?: string | null
  deadline?: string | null
  tht?: string | null
  aantal_per_doos?: number
  aantal_per_inner?: number
  aantal_per_pallet?: number
  pallet_type?: string
  bewerking?: string
  opwerken?: boolean
  bio?: boolean
  omschrijving?: string
}

interface Props {
  action: (prevState: { error: string } | null, formData: FormData) => Promise<{ error: string } | null>
  klanten: Klant[]
  codes: FacturatieCode[]
  initialArtikelen: OrderArtikel[]
  defaultValues?: OrderDefaultValues
  submitLabel?: string
  cancelHref: string
}

export function OrderFormulier({
  action,
  klanten,
  codes,
  initialArtikelen,
  defaultValues: init,
  submitLabel = 'Opslaan',
  cancelHref,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

  const [artikelenVanLookup, setArtikelenVanLookup] = useState<
    Array<{ naam: string; berekening_type: 'delen' | 'vermenigvuldigen'; factor: number }>
  >([])

  const [v, setV] = useState({
    order_nummer:        init?.order_nummer        ?? '',
    order_code:          init?.order_code          ?? '',
    klant_id:            init?.klant_id            ?? '',
    facturatie_code:     init?.facturatie_code_code ?? '',
    order_grootte:       init?.order_grootte?.toString() ?? '',
    locatie:             init?.locatie             ?? '',
    deadline:            init?.deadline            ?? '',
    tht:                 init?.tht                 ?? '',
    aantal_per_doos:     init?.aantal_per_doos?.toString()    ?? '0',
    aantal_per_inner:    init?.aantal_per_inner?.toString()   ?? '0',
    aantal_per_pallet:   init?.aantal_per_pallet?.toString()  ?? '0',
    pallet_type:         init?.pallet_type         ?? 'chep',
    bewerking:           init?.bewerking           ?? '',
    opwerken:            init?.opwerken            ?? false,
    bio:                 init?.bio                 ?? false,
    omschrijving:        init?.omschrijving        ?? '',
  })

  function set(field: keyof typeof v) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setV(prev => ({ ...prev, [field]: e.target.value }))
  }

  function setCheck(field: 'opwerken' | 'bio') {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setV(prev => ({ ...prev, [field]: e.target.checked }))
  }

  function onProductSelect(result: ProductLookupResult) {
    setV(prev => ({
      ...prev,
      order_code: result.order_code,
      omschrijving: result.omschrijving,
      aantal_per_pallet: String(result.aantal_per_pallet),
      pallet_type: result.pallet_type,
    }))
    setArtikelenVanLookup(result.artikelen)
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ordernummer *</label>
          <input name="order_nummer" required value={v.order_nummer} onChange={set('order_nummer')}
            className="form-input" />
        </div>
        <ProductLookup
          value={v.order_code}
          onChange={(val) => setV(prev => ({ ...prev, order_code: val }))}
          onSelect={onProductSelect}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Klant *</label>
          <select name="klant_id" required value={v.klant_id} onChange={set('klant_id')}
            className="form-select">
            <option value="">Selecteer klant...</option>
            {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code</label>
          <input name="facturatie_code" list="codes-datalist"
            value={v.facturatie_code} onChange={set('facturatie_code')}
            placeholder="Optioneel"
            className="form-input" autoComplete="off" />
          <datalist id="codes-datalist">
            {codes.map(c => <option key={c.id} value={c.code}>{c.omschrijving}</option>)}
          </datalist>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Order grootte *</label>
        <input name="order_grootte" type="number" min="1" required
          value={v.order_grootte} onChange={set('order_grootte')}
          className="form-input" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Locatie *</label>
          <select name="locatie" required value={v.locatie} onChange={set('locatie')}
            className="form-select">
            <option value="">Selecteer locatie...</option>
            {LOCATIES.map(l => <option key={l.waarde} value={l.waarde}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <input name="deadline" type="date" value={v.deadline} onChange={set('deadline')}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">THT</label>
          <input name="tht" type="date" value={v.tht} onChange={set('tht')}
            className="form-input" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Per doos</label>
          <input name="aantal_per_doos" type="number" min="0"
            value={v.aantal_per_doos} onChange={set('aantal_per_doos')}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Per inner</label>
          <input name="aantal_per_inner" type="number" min="0"
            value={v.aantal_per_inner} onChange={set('aantal_per_inner')}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dozen per pallet</label>
          <input name="aantal_per_pallet" type="number" min="0"
            value={v.aantal_per_pallet} onChange={set('aantal_per_pallet')}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pallettype</label>
          <select name="pallet_type" value={v.pallet_type} onChange={set('pallet_type')}
            className="form-select">
            {PALLET_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bewerking</label>
        <input name="bewerking" type="number" min="0" value={v.bewerking} onChange={set('bewerking')}
          className="form-input" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input name="opwerken" type="checkbox" id="opwerken"
            checked={v.opwerken} onChange={setCheck('opwerken')} className="form-checkbox" />
          <label htmlFor="opwerken" className="text-sm font-medium text-gray-700">Opwerken</label>
        </div>
        <div className="flex items-center gap-2">
          <input name="bio" type="checkbox" id="bio"
            checked={v.bio} onChange={setCheck('bio')} className="form-checkbox" />
          <label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
        <textarea name="omschrijving" rows={3} value={v.omschrijving} onChange={set('omschrijving')}
          className="form-textarea" />
      </div>

      <ArtikelenForm
        initialArtikelen={initialArtikelen}
        defaultOrderGrootte={init?.order_grootte ?? null}
        lookupArtikelen={artikelenVanLookup}
      />

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary px-6">
          {isPending ? 'Bezig...' : submitLabel}
        </button>
        <a href={cancelHref} className="px-6 py-2 rounded text-sm border border-gray-300 hover:bg-gray-50">
          Annuleren
        </a>
      </div>
    </form>
  )
}
