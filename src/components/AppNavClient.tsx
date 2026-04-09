'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AppNavClientProps {
  isAdmin: boolean
  email: string | null
  signOut: () => Promise<void>
}

export function AppNavClient({ isAdmin, email, signOut }: AppNavClientProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 shadow-[0_2px_10px_rgba(15,23,42,0.04)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
        <Link href="/directory" className="flex-shrink-0">
          <img
            src="/images/PTSA-Logo-Transparent.png"
            alt="Crossroads FLEX PTSA"
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium sm:flex">
          <Link
            href="/directory"
            className="rounded-lg px-3 py-2 text-slate-800 transition-colors hover:text-[#002554]"
          >
            Directory
          </Link>
          <Link
            href="/account/students"
            className="rounded-lg px-3 py-2 text-slate-800 transition-colors hover:text-[#002554]"
          >
            My Profile
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-slate-800 transition-colors hover:text-[#002554]"
            >
              Admin
            </Link>
          )}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-slate-800 transition-colors hover:text-[#002554]"
            >
              Sign out
            </button>
          </form>
          {email && (
            <span className="px-3 text-xs text-slate-400">{email}</span>
          )}
        </nav>

        <button
          className="rounded-lg p-2.5 text-slate-800 transition-colors hover:text-[#002554] sm:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span className="text-xl leading-none">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
          <div className="flex flex-col gap-1 text-sm font-medium">
            {email && (
              <p className="px-3 py-2 text-xs text-slate-400">Signed in as: {email}</p>
            )}
            <Link
              href="/directory"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-slate-800 transition-colors hover:text-[#002554]"
            >
              Directory
            </Link>
            <Link
              href="/account/students"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-slate-800 transition-colors hover:text-[#002554]"
            >
              My Profile
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-slate-800 transition-colors hover:text-[#002554]"
              >
                Admin
              </Link>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-lg px-3 py-2 text-left text-slate-800 transition-colors hover:text-[#002554]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}