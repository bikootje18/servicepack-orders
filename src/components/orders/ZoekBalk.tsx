'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

interface Props {
  defaultValue?: string
}

export function ZoekBalk({ defaultValue }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const waarde = e.target.value
    startTransition(() => {
      if (waarde.trim()) {
        router.push(`${pathname}?zoek=${encodeURIComponent(waarde)}`)
      } else {
        router.push(pathname)
      }
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
