import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function WaitingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold text-[#002554]">Request pending</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Thanks for signing up. A directory admin will review your request and
            approve your access shortly. Check your email for a confirmation once
            you&apos;ve been approved.
          </p>
          {user?.email && (
            <p className="text-xs text-slate-400">Signed in as: {user.email}</p>
          )}
          <div className="flex flex-col items-center gap-2 pt-1">
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-slate-600 underline underline-offset-2 hover:text-slate-900 transition"
              >
                Sign out
              </button>
            </form>
            <Link
              href="/"
              className="text-sm text-[#002554] underline underline-offset-2 hover:text-[#003a7a] transition"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
