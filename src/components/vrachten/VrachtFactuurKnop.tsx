'use client'

import { useState } from 'react'
import type { Factuur } from '@/types'
import { type LeveringMetOrder } from './VrachtFactuurDocument'

interface Props {
  factuur: Factuur
  leveringen: LeveringMetOrder[]
  klantNaam: string
}

export function VrachtFactuurKnop({ factuur, leveringen, klantNaam }: Props) {
  const [laden, setLaden] = useState(false)

  async function handleDownload() {
    setLaden(true)
    try {
      const [{ pdf }, { createElement }, { VrachtFactuurDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./VrachtFactuurDocument'),
      ])
      const blob = await pdf(createElement(VrachtFactuurDocument, { factuur, leveringen, klantNaam }) as any).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `factuur-${factuur.factuur_nummer}.pdf`
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
      className="btn-primary"
    >
      {laden ? 'PDF laden...' : 'Download PDF'}
    </button>
  )
}
