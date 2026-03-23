'use client'

import { useState } from 'react'
import type { VoorraadRegel } from '@/types'

interface Props {
  klantNaam: string
  regels: VoorraadRegel[]
}

export function VoorraadExportKnop({ klantNaam, regels }: Props) {
  const [laden, setLaden] = useState(false)

  async function handleDownload() {
    setLaden(true)
    try {
      const datum = new Date().toLocaleDateString('nl-NL')
      const [{ pdf }, { createElement }, { VoorraadDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./VoorraadDocument'),
      ])
      const blob = await pdf(createElement(VoorraadDocument, { klantNaam, regels, datum }) as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `voorraad-${klantNaam.replace(/\s+/g, '-').toLowerCase()}.pdf`
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
      {laden ? 'PDF laden...' : 'Export PDF'}
    </button>
  )
}
