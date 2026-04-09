'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type State = 'idle' | 'link_sent' | 'pending_approval'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setState('link_sent')
  }

  async function handleGoogleSignIn() {
    setError(null)
    setGoogleLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setGoogleLoading(false)
      setError(error.message)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="text-center space-y-2">
            <img
              src="/images/PTSA-Logo-Transparent.png"
              alt="Crossroads FLEX PTSA"
              className="h-14 w-auto mx-auto"
            />
            <h1 className="text-2xl font-bold text-[#002554]">Sign in</h1>
            <p className="text-sm text-slate-500">
              Sign in with Google or enter your email for a magic link.
            </p>
          </div>

          {state === 'idle' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.2-5.9 6.8l6.2 5.2C39.2 36.7 44 31 44 24c0-1.2-.1-2.3-.4-3.5z"/>
                </svg>
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">Or</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#002554] focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full bg-[#002554] text-white py-2.5 rounded-xl font-medium text-sm hover:bg-[#003a7a] disabled:opacity-60 transition"
                >
                  {loading ? 'Sending…' : 'Send magic link'}
                </button>
              </form>
            </div>
          )}

          {state === 'link_sent' && (
            <div className="text-center space-y-3 py-2">
              <div className="text-4xl">📬</div>
              <p className="font-medium text-slate-800">Check your email</p>
              <p className="text-sm text-slate-500">
                We sent a sign-in link to <span className="font-medium text-slate-700">{email}</span>.
                Click the link in the email to continue.
              </p>
              <button
                onClick={() => {
                  setState('idle')
                  setEmail('')
                }}
                className="text-xs text-[#002554] underline underline-offset-2 hover:text-[#003a7a] transition"
              >
                Use a different email
              </button>
            </div>
          )}

          {state === 'pending_approval' && (
            <div className="text-center space-y-3 py-2">
              <div className="text-4xl">⏳</div>
              <p className="font-medium text-slate-800">Awaiting approval</p>
              <p className="text-sm text-slate-500">
                Your account is pending review by a directory admin. You&apos;ll receive
                an email once your access has been approved.
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Access is limited to verified Crossroads FLEX families only.
        </p>
      </div>
    </main>
  )
}