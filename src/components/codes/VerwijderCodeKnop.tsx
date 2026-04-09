'use client'

import { deleteCodeAction } from '@/lib/actions/codes'

export function VerwijderCodeKnop({ id, code }: { id: string; code: string }) {
  return (
    <form action={deleteCodeAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs text-red-400 hover:text-red-600"
        onClick={(e) => { if (!confirm(`Code '${code}' verwijderen?`)) e.preventDefault() }}
      >
        Verwijderen
      </button>
    </form>
  )
}
