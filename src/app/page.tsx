import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <img
          src="/images/PTSA-Logo-Transparent.png"
          alt="Crossroads FLEX PTSA"
          className="h-20 w-auto mx-auto"
        />
        <h1 className="text-4xl font-bold text-[#002554]">
          FLEX Family Directory
        </h1>
        <p className="text-slate-500">
          A private community directory for Crossroads FLEX families.
        </p>
        <Link
          href="/auth"
          className="inline-block bg-[#002554] text-white px-8 py-3 rounded-2xl font-medium hover:bg-[#003a7a] transition"
        >
          Sign in or request access
        </Link>
        <p className="text-xs text-slate-400">
          Access is limited to verified Crossroads FLEX families only.
        </p>
      </div>
    </main>
  )
}
