'use client'

import { useActionState } from 'react'
import { ArtikelenForm } from './ArtikelenForm'
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
  defaultValues: v,
  submitLabel = 'Opslaan',
  cancelHref,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, null)

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
          <input name="order_nummer" required defaultValue={v?.order_nummer}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Order code *</label>
          <input name="order_code" required defaultValue={v?.order_code}
            className="form-input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Klant *</label>
          <select name="klant_id" required defaultValue={v?.klant_id ?? ''}
            className="form-select">
            <option value="">Selecteer klant...</option>
            {klanten.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facturatie code</label>
          <input name="facturatie_code" list="codes-datalist"
            defaultValue={v?.facturatie_code_code ?? ''}
            placeholder="Optioneel"
            className="form-input" autoComplete="off" />
          <datalist id="codes-datalist">
            {codes.map(c => <option key={c.id} value={c.code}>{c.omschrijving}</option>)}
          </datalist>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Order grootte *</label>
        <input name="order_grootte" type="number" min="1" required defaultValue={v?.order_grootte}
          className="form-input" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Locatie *</label>
          <select name="locatie" required defaultValue={v?.locatie ?? ''}
            className="form-select">
            <option value="">Selecteer locatie...</option>
            {LOCATIES.map(l => <option key={l.waarde} value={l.waarde}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
          <input name="deadline" type="date" defaultValue={v?.deadline ?? ''}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">THT</label>
          <input name="tht" type="date" defaultValue={v?.tht ?? ''}
            className="form-input" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Per doos</label>
          <input name="aantal_per_doos" type="number" min="0" defaultValue={v?.aantal_per_doos ?? 0}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Per inner</label>
          <input name="aantal_per_inner" type="number" min="0" defaultValue={v?.aantal_per_inner ?? 0}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Per pallet</label>
          <input name="aantal_per_pallet" type="number" min="0" defaultValue={v?.aantal_per_pallet ?? 0}
            className="form-input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pallettype</label>
          <select name="pallet_type" defaultValue={v?.pallet_type ?? 'chep'} className="form-select">
            {PALLET_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bewerking</label>
        <input name="bewerking" type="number" min="0" defaultValue={v?.bewerking}
          className="form-input" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input name="opwerken" type="checkbox" id="opwerken" defaultChecked={v?.opwerken} className="form-checkbox" />
          <label htmlFor="opwerken" className="text-sm font-medium text-gray-700">Opwerken</label>
        </div>
        <div className="flex items-center gap-2">
          <input name="bio" type="checkbox" id="bio" defaultChecked={v?.bio} className="form-checkbox" />
          <label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Omschrijving</label>
        <textarea name="omschrijving" rows={3} defaultValue={v?.omschrijving}
          className="form-textarea" />
      </div>

      <ArtikelenForm
        initialArtikelen={initialArtikelen}
        defaultOrderGrootte={v?.order_grootte ?? null}
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
