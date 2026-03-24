'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  href: string
  label: string
}

export function NavLink({ href, label }: Props) {
  const pathname = usePathname()
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-white/10 text-white'
          : 'text-white/45 hover:text-white/75 hover:bg-white/5',
      ].join(' ')}
    >
      <span
        className={[
          'w-1 h-4 rounded-full flex-shrink-0 transition-all duration-150',
          isActive ? 'bg-[#7C3AED]' : 'bg-transparent',
        ].join(' ')}
      />
      {label}
    </Link>
  )
}
