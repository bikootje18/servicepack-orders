'use client'

interface Props {
  naam: string
  action: () => Promise<void>
}

export function VerwijderKlantKnop({ naam, action }: Props) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="text-sm border border-red-200 text-red-500 px-3 py-1.5 rounded hover:bg-red-50"
        onClick={e => { if (!confirm(`Klant "${naam}" definitief verwijderen?`)) e.preventDefault() }}
      >
        Klant verwijderen
      </button>
    </form>
  )
}
