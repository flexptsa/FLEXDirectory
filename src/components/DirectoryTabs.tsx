'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Students', href: '/directory/students' },
  { label: 'Parents', href: '/directory/parents' },
  { label: 'Families', href: '/directory/families' },
]

export function DirectoryTabs() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile: segmented control */}
      <div className="flex sm:hidden rounded-2xl bg-slate-100 p-1 gap-0">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 rounded-xl py-2 text-center text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#002554] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* Desktop: pill tabs */}
      <div className="hidden sm:flex items-center gap-1">
        {TABS.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#002554] text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
    </>
  )
}
