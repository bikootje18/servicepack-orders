import type { Order, Vracht } from '@/types'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate } from '@/lib/utils/formatters'
import { OrderKaartje } from './OrderKaartje'

interface Props {
  label: string
  kleur: string
  inBehandeling: Order[]
  bevestigd: Order[]
  vrachten: Vracht[]
}

function vroegsteDeadline(orders: Order[]): string | null {
  return orders
    .map(o => o.deadline)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null
}

export function LocatieKolom({ label, kleur, inBehandeling, bevestigd, vrachten }: Props) {
  const totaalActief = inBehandeling.length
  const alleOrders = [...inBehandeling, ...bevestigd]
  const vroegste = vroegsteDeadline(alleOrders)
  const urgentie = vroegste ? deadlineKleur(vroegste) : null
  const isEmpty = alleOrders.length === 0 && vrachten.length === 0

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* Header — donker blok met locatienaam */}
      <div className="px-5 py-5" style={{ backgroundColor: kleur }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white leading-tight">{label}</h2>
          {totaalActief > 0 && (
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
            >
              {totaalActief}
            </span>
          )}
        </div>

        {/* Subtekst in header */}
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {totaalActief === 0 && bevestigd.length === 0
              ? 'Geen orders'
              : [
                  totaalActief > 0 && `${totaalActief} actief`,
                  bevestigd.length > 0 && `${bevestigd.length} aankomend`,
                ].filter(Boolean).join(' · ')}
          </p>
          {vroegste && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: urgentie === 'rood' ? '#fef2f2' : urgentie === 'oranje' ? '#fffbeb' : 'rgba(255,255,255,0.2)',
                color: urgentie === 'rood' ? '#dc2626' : urgentie === 'oranje' ? '#92400e' : '#fff',
              }}
            >
              {formatDate(vroegste)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="bg-gray-50">
        {isEmpty ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">Niets gepland</p>
          </div>
        ) : (
          <>
            {/* In behandeling */}
            {inBehandeling.length > 0 && (
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: kleur }}>
                  In behandeling
                </p>
                <div className="flex flex-col gap-2.5">
                  {inBehandeling.map(order => (
                    <OrderKaartje key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Aankomend */}
            {bevestigd.length > 0 && (
              <div className={`p-4 ${inBehandeling.length > 0 ? 'border-t border-gray-200' : ''}`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-1">
                  Aankomend
                </p>
                <div className="flex flex-col gap-2.5">
                  {bevestigd.map(order => (
                    <OrderKaartje key={order.id} order={order} />
                  ))}
                </div>
              </div>
            )}

            {/* Vrachten */}
            {vrachten.length > 0 && (
              <div className="p-4 border-t border-gray-200">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: kleur }}>
                  Uitgaande vrachten
                </p>
                <div className="flex flex-col gap-1.5">
                  {vrachten.map(vracht => (
                    <a
                      key={vracht.id}
                      href={`/vrachten/${vracht.id}`}
                      className="flex items-center justify-between gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 hover:border-gray-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-gray-800">
                          {vracht.vrachtbrief_nummer}
                        </span>
                        {vracht.klant && (
                          <span className="text-xs text-gray-400 truncate">{vracht.klant.naam}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 tabular-nums flex-shrink-0">
                        {formatDate(vracht.datum)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
