'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PortalLoginPage() {
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

    router.push('/portal/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon-preview.png" alt="Service Pack b.v." className="h-12 w-auto object-contain mb-6" />
        <h1 className="text-xl font-bold mb-1 text-gray-900">Klantportaal</h1>
        <p className="text-sm text-gray-500 mb-6">Log in om uw orders te bekijken.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
            <input
              type="password"
              value={wachtwoord}
              onChange={e => setWachtwoord(e.target.value)}
              required
              className="form-input"
            />
          </div>
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <button type="submit" disabled={laden} className="btn-primary w-full">
            {laden ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
