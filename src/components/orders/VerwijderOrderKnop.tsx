'use client'

interface Props {
  orderNummer: string
  action: () => Promise<void>
}

export function VerwijderOrderKnop({ orderNummer, action }: Props) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
        onClick={(e) => {
          if (!confirm(`Order ${orderNummer} verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
            e.preventDefault()
          }
        }}
      >
        Order verwijderen
      </button>
    </form>
  )
}
