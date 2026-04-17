'use client'

import { useState } from 'react'
import type { Order, Vracht, Klant } from '@/types'
import { DASHBOARD_LOCATIES } from '@/lib/constants/locaties'
import { LocatieKolom } from './LocatieKolom'
import { KlantCombobox } from './KlantCombobox'

const KLEUREN = ['#2563eb', '#059669', '#7c3aed', '#6b7280'] as const

interface LocatieData {
  inBehandeling: Order[]
  bevestigd: Order[]
}

interface Props {
  orders: Record<string, LocatieData>
  vrachten: Record<string, Vracht[]>
  overigeOrders: LocatieData
  klanten: Pick<Klant, 'id' | 'naam'>[]
  geselecteerdeKlantId?: string
}

export function DashboardGrid({ orders, vrachten, overigeOrders, klanten, geselecteerdeKlantId }: Props) {
  const [focusLocatie, setFocusLocatie] = useState<string | null>(null)

  const handleFocus = (locatie: string) => {
    setFocusLocatie(prev => prev === locatie ? null : locatie)
  }

  const toonKolom = (locatie: string) => !focusLocatie || focusLocatie === locatie
  const isFocusMode = focusLocatie !== null

  return (
    <div>
      {/* Klantfilter combobox */}
      <div className="mb-6">
        <KlantCombobox
          klanten={klanten}
          geselecteerdeKlantId={geselecteerdeKlantId}
        />
      </div>

      {/* Grid */}
      <div className={isFocusMode ? 'grid grid-cols-1 gap-5 items-start' : 'grid grid-cols-4 gap-5 items-start'}>
        {DASHBOARD_LOCATIES.map((l, i) => {
          if (!toonKolom(l.waarde)) return null
          return (
            <LocatieKolom
              key={l.waarde}
              label={l.label}
              kleur={KLEUREN[i]}
              inBehandeling={orders[l.waarde]?.inBehandeling ?? []}
              bevestigd={orders[l.waarde]?.bevestigd ?? []}
              vrachten={vrachten[l.waarde] ?? []}
              onClick={() => handleFocus(l.waarde)}
              isFocused={focusLocatie === l.waarde}
            />
          )
        })}
        {toonKolom('overig') && (
          <LocatieKolom
            label="Overige locaties"
            kleur={KLEUREN[3]}
            inBehandeling={overigeOrders.inBehandeling}
            bevestigd={overigeOrders.bevestigd}
            vrachten={[]}
            toonLocatie
            onClick={() => handleFocus('overig')}
            isFocused={focusLocatie === 'overig'}
          />
        )}
      </div>
    </div>
  )
}
