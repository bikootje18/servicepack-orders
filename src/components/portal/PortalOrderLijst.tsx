'use client'

import { useState } from 'react'
import type { PortalOrder } from '@/types'
import { statusLabel, statusKleurKlasse } from '@/lib/utils/portal-status'

export function PortalOrderLijst({ orders }: { orders: PortalOrder[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (orders.length === 0) {
    return <p className="text-sm text-gray-400">Geen actieve orders gevonden.</p>
  }

  return (
    <div className="space-y-2">
      {orders.map(order => (
        <div key={order.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenId(openId === order.id ? null : order.id)}
            className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 grid grid-cols-5 gap-4 items-center text-sm min-w-0">
              <span className="font-medium text-gray-900 truncate">{order.order_nummer}</span>
              <span className="font-mono text-xs text-gray-500 truncate">{order.order_code}</span>
              <span className={`inline-flex w-fit px-2 py-0.5 rounded text-xs font-medium ${statusKleurKlasse(order.status)}`}>
                {statusLabel(order.status)}
              </span>
              <span className="text-right tabular-nums text-gray-700">
                {order.order_grootte.toLocaleString('nl-NL')} st.
              </span>
              <span className="text-gray-400 text-xs text-right">{order.deadline ?? '—'}</span>
            </div>
            <span className="text-gray-300 text-xs ml-2 flex-shrink-0">
              {openId === order.id ? '▲' : '▼'}
            </span>
          </button>

          {openId === order.id && (
            <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
              <div className="grid grid-cols-5 gap-4 mb-5">
                <Detail label="THT" value={order.tht ?? '—'} />
                <Detail label="Pallettype" value={order.pallet_type} />
                <Detail label="Per doos" value={String(order.aantal_per_doos)} />
                <Detail label="Per inner" value={String(order.aantal_per_inner)} />
                <Detail label="Per pallet" value={String(order.aantal_per_pallet)} />
              </div>

              {order.leveringen.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Leveringen
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-1.5 font-medium text-gray-500">Datum</th>
                        <th className="text-right py-1.5 font-medium text-gray-500">Aantal</th>
                        <th className="text-left py-1.5 pl-4 font-medium text-gray-500">Notities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.leveringen.map(l => (
                        <tr key={l.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-1.5 text-gray-700">{l.leverdatum}</td>
                          <td className="py-1.5 text-right tabular-nums text-gray-700">
                            {l.aantal_geleverd.toLocaleString('nl-NL')}
                          </td>
                          <td className="py-1.5 pl-4 text-gray-400">{l.notities || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p className="text-xs text-gray-400">Nog geen leveringen voor deze order.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-400 mb-0.5">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  )
}
