'use client'

import type { Vracht } from '@/types'

export function VrachtbriefKnop({ vracht }: { vracht: Vracht }) {
  return (
    <button
      disabled
      className="text-sm border border-gray-300 px-3 py-1 rounded opacity-50 cursor-not-allowed"
    >
      Download vrachtbrief
    </button>
  )
}
