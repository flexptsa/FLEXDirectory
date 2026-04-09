import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { PageHeader } from '@/components/PageHeader'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function ParentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const q = params.q?.trim() ?? ''

  let query = supabase
    .from('parents')
    .select(`
      id, first_name, last_name, photo_url, show_photo,
      family:families!inner(
        id, family_display_name, general_location, show_location, deleted_at,
        students(first_name, last_name, grade, is_listed_in_directory)
      )
    `)
    .is('families.deleted_at', null)
    .order('first_name')

  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)

  const { data: rawParents } = await query

  const parentCards = await Promise.all(
    (rawParents ?? []).map(async (parent) => {
      const family = parent.family as any
      const photoUrl = parent.show_photo && parent.photo_url
        ? await getSignedUrl(parent.photo_url) : null
      const listedStudents = (family.students ?? [])
        .filter((s: any) => s.is_listed_in_directory)
        .map((s: any) => `${s.first_name} (${s.grade} Grade)`)
        .join(', ')
      return { parent, family, photoUrl, listedStudents }
    })
  )

  const activeFilters = [q].filter(Boolean)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Parents & Guardians"
          subtitle="Crossroads FLEX PTSA"
        />

        {/* Search bar */}
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <form className="flex flex-col gap-3 sm:flex-row">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search parents by name..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
            />
            <button
              type="submit"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Search
            </button>
          </form>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Filtering by:</span>
            {activeFilters.map(f => (
              <span key={f} className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-medium text-sky-800">{f}</span>
            ))}
            <a href="/directory/parents" className="text-xs text-slate-500 underline">Clear</a>
          </div>
        )}

        {/* Count */}
        <p className="text-sm text-slate-500">
          {parentCards.length} parent{parentCards.length !== 1 ? 's' : ''} &amp; guardian{parentCards.length !== 1 ? 's' : ''}
        </p>

        {/* Grid */}
        {parentCards.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <p className="text-lg">No parents match your search.</p>
            <a href="/directory/parents" className="mt-2 block text-sm underline">Clear filters</a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {parentCards.map(({ parent, family, photoUrl, listedStudents }) => (
              <Link
                key={parent.id}
                href={`/directory/families/${family.id}`}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Portrait photo */}
                <div className="aspect-[4/5] sm:aspect-square overflow-hidden bg-slate-100">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={`${parent.first_name}${parent.last_name ? ' ' + parent.last_name : ''}`}
                      className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <svg className="h-16 w-16 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-4">
                  <h3 className="text-base font-semibold leading-none text-slate-900">
                    {parent.first_name}
                  </h3>
                  {parent.last_name && (
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{parent.last_name}</p>
                  )}
                  {listedStudents && (
                    <p className="mt-1.5 text-xs font-semibold text-sky-700 leading-snug">
                      {listedStudents}
                    </p>
                  )}
                  {family.show_location && family.general_location && (
                    <p className="mt-1 text-xs text-slate-400">{family.general_location}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
