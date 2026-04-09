'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Family', href: '/account/profile/family' },
  { label: 'Parents', href: '/account/profile/parents' },
  { label: 'Students', href: '/account/profile/students' },
  { label: 'Review', href: '/account/profile/review' },
]

export function ProfileTabNav() {
  const pathname = usePathname()

  return (
    <nav className="-mx-4 px-4 border-b border-slate-200 overflow-x-auto">
      <div className="flex min-w-max">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                isActive ? 'text-[#002554]' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#CB9700] rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
