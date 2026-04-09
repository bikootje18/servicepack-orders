'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  mailtoHref: string
}

export function AutoMail({ mailtoHref }: Props) {
  const router = useRouter()

  useEffect(() => {
    window.location.href = mailtoHref
    // Verwijder ?mail=1 uit de URL zonder page reload
    router.replace(window.location.pathname)
  }, [mailtoHref, router])

  return null
}
