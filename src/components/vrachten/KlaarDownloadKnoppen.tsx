'use client'

import { useState } from 'react'
import type { Factuur } from '@/types'
import type { LeveringMetOrder } from './VrachtFactuurDocument'
import type { Vracht } from '@/types'

interface Props {
  vracht: Vracht
  factuur: Factuur
  leveringen: LeveringMetOrder[]
  klantNaam: string
}

export function KlaarDownloadKnoppen({ vracht, factuur, leveringen, klantNaam }: Props) {
  const [vrachtbriefLaden, setVrachtbriefLaden] = useState(false)
  const [factuurLaden, setFactuurLaden] = useState(false)

  async function downloadVrachtbrief() {
    setVrachtbriefLaden(true)
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
      setVrachtbriefLaden(false)
    }
  }

  async function downloadFactuur() {
    setFactuurLaden(true)
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
      setFactuurLaden(false)
    }
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Vrachtbrief */}
      <button
        onClick={downloadVrachtbrief}
        disabled={vrachtbriefLaden}
        className="group flex flex-col items-center gap-4 bg-white border-2 border-gray-200 hover:border-[#6B21A8] rounded-xl p-8 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
      >
        <div className="w-14 h-14 bg-gray-100 group-hover:bg-[#F3E8FF] rounded-xl flex items-center justify-center transition-colors">
          <svg className="w-7 h-7 text-gray-400 group-hover:text-[#6B21A8] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900 mb-0.5">Vrachtbrief</p>
          <p className="text-xs text-gray-400 font-mono">{vracht.vrachtbrief_nummer}</p>
          <p className="text-xs text-gray-400 mt-0.5">voor de chauffeur</p>
        </div>
        <span className="text-sm font-medium text-gray-500 group-hover:text-[#6B21A8] transition-colors">
          {vrachtbriefLaden ? 'Laden...' : '↓ Download'}
        </span>
      </button>

      {/* Factuur */}
      <button
        onClick={downloadFactuur}
        disabled={factuurLaden}
        className="group flex flex-col items-center gap-4 bg-white border-2 border-gray-200 hover:border-[#6B21A8] rounded-xl p-8 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
      >
        <div className="w-14 h-14 bg-gray-100 group-hover:bg-[#F3E8FF] rounded-xl flex items-center justify-center transition-colors">
          <svg className="w-7 h-7 text-gray-400 group-hover:text-[#6B21A8] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l2 2 4-4M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900 mb-0.5">Factuur</p>
          <p className="text-xs text-gray-400 font-mono">{factuur.factuur_nummer}</p>
          <p className="text-xs text-gray-400 mt-0.5">voor de boekhouding</p>
        </div>
        <span className="text-sm font-medium text-gray-500 group-hover:text-[#6B21A8] transition-colors">
          {factuurLaden ? 'Laden...' : '↓ Download'}
        </span>
      </button>
    </div>
  )
}
