import Link from 'next/link'
import { GraduationCap, Users, Home, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

function getGreeting(hours: number) {
  if (hours < 12) return 'Good morning'
  if (hours < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function DirectoryHomePage() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const [
    { count: studentCount },
    { count: familyCount },
    { data: pursuitRows },
    { data: userData },
  ] = await Promise.all([
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_listed_in_directory', true),
    supabase
      .from('families')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('students')
      .select('primary_pursuit')
      .eq('is_listed_in_directory', true),
    authUser
      ? supabase.from('users').select('full_name').eq('id', authUser.id).single()
      : Promise.resolve({ data: null }),
  ])

  const pursuitCount = new Set(
    (pursuitRows ?? []).map((r) => r.primary_pursuit).filter(Boolean)
  ).size

  const firstName = userData?.full_name?.split(' ')[0] ?? null
  const greeting = firstName ? `${getGreeting(new Date().getHours())}, ${firstName}` : null

  const stats = [
    { label: 'Families', value: familyCount ?? 0 },
    { label: 'Students', value: studentCount ?? 0 },
    { label: 'Pursuits', value: pursuitCount },
  ]

  const cards = [
    {
      href: '/directory/students',
      icon: GraduationCap,
      title: 'Students',
      desc: 'Browse or search by name, grade, pursuit, or club.',
      bg: 'bg-[#F4F6FF]',
      border: 'border-[#C8D6FF]',
      iconBg: 'bg-white/85',
      accent: 'text-[#0C3778]',
      arrow: 'text-[#6D86C2]',
      hoverShadow: 'hover:shadow-[0_18px_40px_rgba(46,83,176,0.16)]',
    },
    {
      href: '/directory/parents',
      icon: Users,
      title: 'Parents',
      desc: 'Search by name or browse photos to put names to faces.',
      bg: 'bg-[#FFF9EE]',
      border: 'border-[#EECF73]',
      iconBg: 'bg-white/85',
      accent: 'text-[#A26C00]',
      arrow: 'text-[#C4A04B]',
      hoverShadow: 'hover:shadow-[0_18px_40px_rgba(179,131,18,0.15)]',
    },
    {
      href: '/directory/families',
      icon: Home,
      title: 'Families',
      desc: 'Browse Phoenix Families.',
      bg: 'bg-[#F2FBF5]',
      border: 'border-[#B8E4C4]',
      iconBg: 'bg-white/85',
      accent: 'text-[#166534]',
      arrow: 'text-[#5EAA79]',
      hoverShadow: 'hover:shadow-[0_18px_40px_rgba(34,120,72,0.15)]',
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <section className="bg-gradient-to-b from-[#0A2F5A] to-[#08264A] px-4 py-6 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-4xl">
            {greeting && (
              <p className="text-sm font-medium tracking-wide text-white/65 sm:text-base">
                {greeting}
              </p>
            )}

            <h1 className="mt-2 text-4xl font-extrabold leading-[0.95] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
              Phoenix Family Directory
            </h1>

            <p className="mt-3 max-w-2xl text-lg leading-7 text-white/70 sm:text-xl">
              Connecting the families behind the pursuits.
            </p>
          </div>

          <div className="mt-6 h-px w-full bg-gradient-to-r from-white/20 via-white/20 to-transparent" />

          <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-full border border-white/30 bg-white/25 px-3 py-1.5 sm:px-4 sm:py-2"
              >
                <span className="text-lg font-bold tracking-tight text-white sm:text-2xl">
                  {stat.value}
                </span>
                <span className="ml-1.5 text-xs font-semibold lowercase tracking-[0.08em] text-white/80 sm:ml-2 sm:tracking-[0.12em]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:items-stretch">
          {cards.map(
            ({
              href,
              icon: Icon,
              title,
              desc,
              bg,
              border,
              iconBg,
              accent,
              arrow,
              hoverShadow,
            }) => (
              <Link
                key={href}
                href={href}
                className={[
                  'group flex h-full flex-col rounded-[1.75rem] border p-6 transition-all duration-200',
                  'shadow-[0_10px_28px_rgba(15,23,42,0.07)]',
                  'hover:-translate-y-1',
                  hoverShadow,
                  'sm:p-7',
                  bg,
                  border,
                ].join(' ')}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} shadow-sm ring-1 ring-black/5`}
                >
                  <Icon className={`h-7 w-7 ${accent}`} strokeWidth={1.9} />
                </div>

                <p className={`mt-4 text-2xl font-bold tracking-tight ${accent} sm:text-3xl`}>
                  {title}
                </p>

                <p className="mt-2.5 flex-1 text-base leading-7 text-slate-600">
                  {desc}
                </p>

                <div className="mt-auto flex justify-end pt-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm ring-1 ring-black/10 transition-transform duration-200 group-hover:translate-x-1">
                    <ArrowRight className={`h-4.5 w-4.5 ${arrow}`} strokeWidth={1.9} />
                  </div>
                </div>
              </Link>
            )
          )}
        </section>
      </div>
    </main>
  )
}