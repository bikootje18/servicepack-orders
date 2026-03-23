'use client'

import dynamic from 'next/dynamic'
import type { Factuur, Levering } from '@/types'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false }
)

const FactuurDocument = dynamic(
  () => import('./FactuurDocument').then(m => m.FactuurDocument),
  { ssr: false }
)

interface Props {
  factuur: Factuur
  leveringen: Levering[]
  klantNaam: string
}

export function FactuurPrintKnop({ factuur, leveringen, klantNaam }: Props) {
  return (
    <PDFDownloadLink
      document={<FactuurDocument factuur={factuur} leveringen={leveringen} klantNaam={klantNaam} />}
      fileName={`factuur-${factuur.factuur_nummer}.pdf`}
      className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 inline-block"
    >
      {({ loading }) => loading ? 'PDF laden...' : 'Download PDF'}
    </PDFDownloadLink>
  )
}
