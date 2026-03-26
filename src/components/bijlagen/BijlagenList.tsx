'use client'
import type { OrderBijlage } from '@/types'
import { deleteBijlage } from '@/lib/actions/bijlagen'
import { useRouter } from 'next/navigation'

interface Props {
  bijlagen: OrderBijlage[]
  orderId: string
}

function bestandsIcoon(mimeType: string | null): string {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📋'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
  return '📄'
}

function formatGrootte(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function BijlagenList({ bijlagen, orderId }: Props) {
  const router = useRouter()

  if (bijlagen.length === 0) return null

  async function handleDelete(bijlage: OrderBijlage) {
    if (!confirm(`"${bijlage.bestandsnaam}" verwijderen?`)) return
    await deleteBijlage(bijlage.id, bijlage.opslag_pad, orderId)
    router.refresh()
  }

  return (
    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg bg-white overflow-hidden">
      {bijlagen.map((b) => (
        <div key={b.id} className="flex items-center gap-3 px-4 py-3">
          <span className="text-xl flex-shrink-0">{bestandsIcoon(b.mime_type)}</span>
          <div className="flex-1 min-w-0">
            <a
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block"
            >
              {b.bestandsnaam}
            </a>
            <p className="text-xs text-gray-400">
              {formatGrootte(b.bestandsgrootte)}
              {b.aangemaakt_op && ` · ${new Date(b.aangemaakt_op).toLocaleDateString('nl-NL')}`}
            </p>
          </div>
          <a
            href={b.url}
            download={b.bestandsnaam}
            className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 px-2 py-1 rounded hover:bg-gray-100"
          >
            Download
          </a>
          <button
            onClick={() => handleDelete(b)}
            className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 px-2 py-1 rounded hover:bg-red-50"
          >
            Verwijder
          </button>
        </div>
      ))}
    </div>
  )
}
