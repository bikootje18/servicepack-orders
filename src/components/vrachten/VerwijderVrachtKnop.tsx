'use client'

import { useRouter } from 'next/navigation'
import { verwijderVracht } from '@/lib/actions/vrachten'

interface Props {
  vrachtId: string
  vrachtbriefNummer?: string
}

export function VerwijderVrachtKnop({ vrachtId, vrachtbriefNummer }: Props) {
  const router = useRouter()

  async function handleVerwijder() {
    const bevestigd = confirm(
      `Vracht ${vrachtbriefNummer ?? ''} verwijderen? Dit kan niet ongedaan worden gemaakt.`
    )
    if (!bevestigd) return
    await verwijderVracht(vrachtId)
    router.push('/vrachten')
  }

  return (
    <button
      type="button"
      onClick={handleVerwijder}
      className="px-3 py-1 text-sm font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
    >
      Verwijderen
    </button>
  )
}
