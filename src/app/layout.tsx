import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = { title: 'OSS – Orderbeheer' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={dmSans.variable}>
      <body className="bg-[#F8F7F4] text-[#111827] antialiased">{children}</body>
    </html>
  )
}
