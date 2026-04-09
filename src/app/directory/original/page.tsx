import Link from 'next/link'
import { GraduationCap, Users, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DirectoryHomePage() {
  const supabase = await createClient()

  // Get pursuit tags, club tags, and community stats
  const [
    { data: pursuitTags },
    { data: clubTags },
    { count: studentCount },
    { count: familyCount },
    { data: pursuitRows },
  ] = await Promise.all([
    supabase.from('pursuit_tags').select('name').order('name'),
    supabase.from('club_tags').select('name').order('name'),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_listed_in_directory', true),
    supabase.from('families').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('students').select('primary_pursuit').eq('is_listed_in_directory', true),
  ])

  const pursuitCount = new Set((pursuitRows ?? []).map(r => r.primary_pursuit).filter(Boolean)).size

  const browseTags = [
    ...(pursuitTags ?? []).map(t => ({ name: t.name, type: 'pursuit' })),
    ...(clubTags ?? []).map(t => ({ name: t.name, type: 'club' })),
  ]

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Crossroads FLEX Family Directory
          </h1>
          <p className="mt-3 text-xl text-slate-500">Connecting the families behind the pursuits.</p>
        </div>

        {/* Community stats */}
        <div className="rounded-2xl border border-slate-200 bg-white py-6 shadow-sm">
          <div className="flex items-start justify-around gap-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-[#002554]">{studentCount ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">Students</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-[#002554]">{familyCount ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">Families</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-[#002554]">{pursuitCount}</p>
              <p className="mt-1 text-sm text-slate-500">Pursuits</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <form action="/directory/students" method="GET">
            <input
              name="q"
              placeholder="Search students, parents, pursuits..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
            />
          </form>
        </div>

        {/* Section cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              href: '/directory/students',
              icon: GraduationCap,
              title: 'Students',
              desc: 'Search by name, grade, pursuit, or club.',
            },
            {
              href: '/directory/parents',
              icon: Users,
              title: 'Parents',
              desc: 'Browse parent photos and reconnect names to faces.',
            },
            {
              href: '/directory/families',
              icon: Home,
              title: 'Families',
              desc: 'Explore carpools, social connections, and shared interests.',
            },
          ].map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Icon className="h-7 w-7 text-[#002554]" strokeWidth={1.5} />
              <p className="mt-3 text-xl font-bold text-[#002554]">{title}</p>
              <p className="mt-1 text-sm text-slate-600">{desc}</p>
            </Link>
          ))}
        </div>

      </div>
    </main>
  )
}
