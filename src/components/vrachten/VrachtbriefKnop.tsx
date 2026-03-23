'use client'

import { useState } from 'react'
import type { Vracht } from '@/types'

interface Props {
  vracht: Vracht
}

export function VrachtbriefKnop({ vracht }: Props) {
  const [laden, setLaden] = useState(false)

  async function handleDownload() {
    setLaden(true)
    try {
      const [{ pdf }, { createElement }, { VrachtbriefDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./VrachtbriefDocument'),
      ])
      const blob = await pdf(createElement(VrachtbriefDocument, { vracht: vracht as any }) as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vrachtbrief-${vracht.vrachtbrief_nummer}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLaden(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={laden}
      className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 disabled:opacity-50"
    >
      {laden ? 'PDF laden...' : 'Download vrachtbrief'}
    </button>
  )
}
