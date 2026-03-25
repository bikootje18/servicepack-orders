'use client'
import { useState, useRef } from 'react'
import { verwerkGiveXImports, ImportResultaat } from '@/lib/actions/give-x-imports'

export function ImportDropzone({ klantId }: { klantId: string }) {
  const [bezig, setBezig] = useState(false)
  const [resultaten, setResultaten] = useState<ImportResultaat[] | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const bestanden = formData.getAll('bestanden') as File[]
    if (bestanden.length === 0 || !bestanden[0].name) return

    setBezig(true)
    setResultaten(null)
    try {
      const res = await verwerkGiveXImports(klantId, formData)
      setResultaten(res)
    } finally {
      setBezig(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const gematchte = resultaten?.filter(r => r.status === 'gematcht').length ?? 0
  const nietGevonden = resultaten?.filter(r => r.status === 'niet_gevonden').length ?? 0
  const fouten = resultaten?.filter(r => r.status === 'fout' || r.status === 'al_verwerkt') ?? []

  return (
    <div>
      <form onSubmit={handleSubmit} className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          name="bestanden"
          multiple
          accept=".xlsx,.csv"
          className="hidden"
          id="give-x-upload"
        />
        <label
          htmlFor="give-x-upload"
          className="block cursor-pointer text-sm text-gray-500 mb-3 hover:text-gray-700"
        >
          Klik om bestanden te kiezen
          <span className="block text-xs mt-1">.xlsx of .csv — meerdere bestanden tegelijk</span>
        </label>
        <button
          type="submit"
          disabled={bezig}
          className="btn-primary disabled:opacity-50"
        >
          {bezig ? 'Verwerken...' : 'Importeren'}
        </button>
      </form>

      {resultaten && (
        <div className="mt-4 text-sm space-y-2">
          {gematchte > 0 && (
            <p className="text-green-700">✓ {gematchte} order{gematchte !== 1 ? 's' : ''} gematcht</p>
          )}
          {nietGevonden > 0 && (
            <p className="text-amber-700">⚠ {nietGevonden} code{nietGevonden !== 1 ? 's' : ''} niet gevonden — staat onder "Nog te koppelen"</p>
          )}
          {fouten.map(r => (
            <p key={r.bestandsnaam} className="text-red-700">
              ✗ {r.bestandsnaam}: {r.status === 'al_verwerkt' ? 'al eerder verwerkt' : r.foutmelding}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
