'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [laden, setLaden] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLaden(true)
    setFout(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })

    if (error) {
      setFout('E-mailadres of wachtwoord onjuist.')
      setLaden(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Inloggen</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
          <input
            type="password"
            value={wachtwoord}
            onChange={e => setWachtwoord(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {fout && <p className="text-sm text-red-600">{fout}</p>}
        <button
          type="submit"
          disabled={laden}
          className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {laden ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>
    </div>
  )
}
