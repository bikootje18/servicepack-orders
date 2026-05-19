'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

interface Props {
  defaultValue?: string
}

export function ZoekBalk({ defaultValue }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const waarde = e.target.value
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('pagina')
      if (waarde.trim()) {
        params.set('zoek', waarde)
      } else {
        params.delete('zoek')
      }
      const query = params.toString()
      router.push(query ? `${pathname}?${query}` : pathname)
    })
  }

  return (
    <input
      type="search"
      placeholder="Zoek op ordernummer of code..."
      defaultValue={defaultValue}
      onChange={handleChange}
      className="form-input w-64"
    />
  )
}
