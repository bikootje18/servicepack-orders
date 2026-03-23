import Link from 'next/link'

interface Props {
  pagina: number
  totaalPaginas: number
  basisUrl: string
}

export function Pagination({ pagina, totaalPaginas, basisUrl }: Props) {
  if (totaalPaginas <= 1) return null
  return (
    <div className="flex gap-2 mt-4 text-sm">
      {pagina > 1 && (
        <Link href={`${basisUrl}?pagina=${pagina - 1}`}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
          ← Vorige
        </Link>
      )}
      <span className="px-3 py-1 text-gray-600">
        {pagina} / {totaalPaginas}
      </span>
      {pagina < totaalPaginas && (
        <Link href={`${basisUrl}?pagina=${pagina + 1}`}
          className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">
          Volgende →
        </Link>
      )}
    </div>
  )
}
