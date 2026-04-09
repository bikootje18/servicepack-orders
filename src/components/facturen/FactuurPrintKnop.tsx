'use client'

import { useState } from 'react'
import type { Factuur, Levering } from '@/types'

interface Props {
  factuur: Factuur
  leveringen: Levering[]
  klantNaam: string
}

export function FactuurPrintKnop({ factuur, leveringen, klantNaam }: Props) {
  const [laden, setLaden] = useState(false)

  async function handleDownload() {
    setLaden(true)
    try {
      const [{ pdf }, { createElement }, { FactuurDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('react'),
        import('./FactuurDocument'),
      ])
      const logoUrl = await fetch('/servicepack_logo.png')
        .then(r => r.blob())
        .then(b => new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.readAsDataURL(b) }))
        .catch(() => undefined)
      const blob = await pdf(createElement(FactuurDocument, { factuur, leveringen, klantNaam, logoUrl }) as any).toBlob()
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
