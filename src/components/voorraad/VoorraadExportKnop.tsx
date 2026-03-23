'use client'

import dynamic from 'next/dynamic'
import type { VoorraadRegel } from '@/types'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false }
)

const VoorraadDocument = dynamic(
  () => import('./VoorraadDocument').then(m => m.VoorraadDocument),
  { ssr: false }
)

interface Props {
  klantNaam: string
  regels: VoorraadRegel[]
}

export function VoorraadExportKnop({ klantNaam, regels }: Props) {
  const datum = new Date().toLocaleDateString('nl-NL')
  return (
    <PDFDownloadLink
      document={<VoorraadDocument klantNaam={klantNaam} regels={regels} datum={datum} />}
      fileName={`voorraad-${klantNaam.replace(/\s+/g, '-').toLowerCase()}.pdf`}
      className="text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50 inline-block"
    >
      {({ loading }) => loading ? 'PDF laden...' : 'Export PDF'}
    </PDFDownloadLink>
  )
}
