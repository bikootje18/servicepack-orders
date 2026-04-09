'use client'

import { useState } from 'react'
import type { Vracht } from '@/types'

interface Props {
  vracht: Vracht
}

export function VrachtbriefKnop({ vracht }: Props) {
  const [laden, setLaden] = useState<null | 'normaal' | 'cmr'>(null)

  async function handleDownload(type: 'normaal' | 'cmr') {
    setLaden(type)
    try {
      const [{ pdf }, { createElement }, doc] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        type === 'cmr'
          ? import('./CmrOverlayDocument')
          : import('./VrachtbriefDocument'),
      ])
      const Component = type === 'cmr'
        ? (doc as any).CmrOverlayDocument
        : (doc as any).VrachtbriefDocument
      const blob = await pdf(createElement(Component, { vracht: vracht as any }) as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vrachtbrief-${vracht.vrachtbrief_nummer}${type === 'cmr' ? '-cmr-overlay' : ''}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLaden(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleDownload('normaal')}
        disabled={laden !== null}
        className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50"
      >
        {laden === 'normaal' ? 'PDF laden...' : 'Download vrachtbrief'}
      </button>
      <button
        onClick={() => handleDownload('cmr')}
        disabled={laden !== null}
        className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50"
      >
        {laden === 'cmr' ? 'PDF laden...' : 'CMR overlay'}
      </button>
    </div>
  )
}
