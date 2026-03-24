'use client'

export function PrintKnop() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print text-sm border border-gray-300 px-3 py-1 rounded hover:bg-gray-50"
    >
      Printen
    </button>
  )
}
