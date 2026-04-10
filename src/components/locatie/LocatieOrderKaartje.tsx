import Link from 'next/link'
import type { Order } from '@/types'
import { deadlineKleur } from '@/lib/db/dashboard'
import { formatDate, formatAantal } from '@/lib/utils/formatters'

interface Props {
  order: Order
  locatie: string
}

export function LocatieOrderKaartje({ order, locatie }: Props) {
  const kleur = deadlineKleur(order.deadline)
  const isActief = order.status === 'in_behandeling'

  const accentKleur =
    kleur === 'rood'   ? '#dc2626' :
    kleur === 'oranje' ? '#d97706' :
    isActief           ? '#7c3aed' :
                         '#64748b'

  const deadlineKleurStijl =
    kleur === 'rood'   ? { backgroundColor: 'rgba(220,38,38,0.15)', color: '#fca5a5' } :
    kleur === 'oranje' ? { backgroundColor: 'rgba(217,119,6,0.15)', color: '#fcd34d' } :
                         { backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8' }

  return (
    <Link
      href={`/locatie/${locatie}/orders/${order.id}`}
      className="locatie-kaartje group block rounded-xl overflow-hidden transition-all duration-150 hover:-translate-y-0.5"
      style={{
        backgroundColor: '#111827',
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      <div style={{ display: 'flex' }}>
        {/* Accentbalk */}
        <div style={{ width: '4px', flexShrink: 0, backgroundColor: accentKleur }} />

        <div style={{ flex: 1, padding: '16px 18px', minWidth: 0 }}>

          {/* Ordernummer + aantal */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.01em', lineHeight: 1 }}>
              {order.order_nummer}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#475569', flexShrink: 0, marginTop: '2px' }}>
              {formatAantal(order.order_grootte)} st.
            </span>
          </div>

          {/* Omschrijving */}
          {(order.omschrijving || order.bewerking) && (
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.4, marginBottom: '12px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
              {order.omschrijving || order.bewerking}
            </p>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accentKleur }}>
              {isActief ? '▶ Actief' : '◎ Aankomend'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {order.tht && (
                <span style={{ fontSize: '10px', color: '#475569' }}>
                  THT {formatDate(order.tht)}
                </span>
              )}
              {order.deadline && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', ...deadlineKleurStijl }}>
                  {formatDate(order.deadline)}
                </span>
              )}
            </div>
          </div>

        </div>
      </div>
    </Link>
  )
}
