import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { PageHeader } from '@/components/PageHeader'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

export default async function FamiliesPage() {
  const supabase = await createClient()

  const { data: families } = await supabase
    .from('families')
    .select(`
      id, family_display_name, general_location, show_location, photo_url,
      open_to_carpool, open_to_study_groups, open_to_social_meetups,
      parents(id, first_name, last_name, photo_url, show_photo, display_order),
      students(id, first_name, last_name, grade, primary_pursuit, is_listed_in_directory)
    `)
    .is('deleted_at', null)
    .order('family_display_name')

  const familiesWithPhotos = await Promise.all(
    (families ?? []).map(async (family) => {
      const sortedParents = [...(family.parents ?? [])].sort((a, b) => a.display_order - b.display_order)
      const fallbackParent = sortedParents.find((p: any) => p.show_photo && p.photo_url) as any | undefined
      const avatarUrl = family.photo_url
        ? await getSignedUrl(family.photo_url)
        : fallbackParent ? await getSignedUrl(fallbackParent.photo_url) : null
      const parentNames = sortedParents.map((p: any) => `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`).join(' & ')
      return { family, avatarUrl, parentNames }
    })
  )

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader
          title="Families"
          subtitle="Crossroads FLEX PTSA"
        />

        <p className="text-sm text-slate-500">{familiesWithPhotos.length} families</p>

        <div className="space-y-4">
          {familiesWithPhotos.map(({ family, avatarUrl, parentNames }) => {
            const listedStudents = (family.students ?? []).filter((s: any) => s.is_listed_in_directory)
            const openTo = [
              family.open_to_carpool && 'Carpool',
              family.open_to_study_groups && 'Study groups',
              family.open_to_social_meetups && 'Meetups',
            ].filter(Boolean) as string[]

            return (
              <div key={family.id} className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                {/* Full-card link — sits behind all other content */}
                <Link href={`/directory/families/${family.id}`} className="absolute inset-0 z-0" aria-label={`View the ${family.family_display_name} Family`} />

                <div className="relative z-10 p-5 sm:p-6 pointer-events-none">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-[#CB9700]">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={family.family_display_name} className="h-full w-full object-cover object-top" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-lg font-semibold text-slate-400">
                          {family.family_display_name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-semibold text-slate-900">The {family.family_display_name} Family</h2>
                      {parentNames && (
                        <p className="text-sm text-slate-500">{parentNames}</p>
                      )}

                      {family.show_location && family.general_location && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {family.general_location}
                        </div>
                      )}

                      {openTo.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {openTo.map(tag => (
                            <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Student chips — re-enable pointer events so they remain clickable */}
                  {listedStudents.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {listedStudents.map((s: any) => (
                        <Link
                          key={s.id}
                          href={`/directory/students/${s.id}`}
                          className="pointer-events-auto rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm transition hover:bg-slate-100"
                        >
                          <span className="font-medium text-slate-900">{s.first_name} {s.last_name}</span>
                          <span className="ml-1.5 text-xs text-sky-700">{s.primary_pursuit} · {s.grade} Grade</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
