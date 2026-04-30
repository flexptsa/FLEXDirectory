import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { PageHeader } from '@/components/PageHeader'
import Link from 'next/link'

export default async function FamiliesPage() {
  const supabase = await createClient()

  const { data: families } = await supabase
    .from('families')
    .select(`
      id, family_display_name, photo_url,
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
        : fallbackParent
          ? await getSignedUrl(fallbackParent.photo_url)
          : null
      const parentNames = sortedParents
        .map((p: any) => `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`)
        .join(' & ')
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {familiesWithPhotos.map(({ family, avatarUrl, parentNames }) => {
            const listedStudents = (family.students ?? []).filter((s: any) => s.is_listed_in_directory)

            return (
              <Link
                key={family.id}
                href={`/directory/families/${family.id}`}
                className="group flex items-start gap-4 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Square thumbnail */}
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`The ${family.family_display_name} Family`}
                      className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-3xl font-semibold text-slate-300">
                        {family.family_display_name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className="text-base font-semibold leading-snug text-slate-900">
                    The {family.family_display_name} Family
                  </h3>
                  {parentNames && (
                    <p className="mt-0.5 text-sm text-slate-500 leading-snug">{parentNames}</p>
                  )}
                  {listedStudents.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {listedStudents.map((s: any) => (
                        <p key={s.id} className="text-sm font-medium text-sky-700 leading-snug">
                          {s.first_name}{s.last_name ? ` ${s.last_name}` : ''}
                          {s.primary_pursuit || s.grade
                            ? <span className="font-normal text-sky-600"> · {[s.primary_pursuit, s.grade ? `${s.grade} Grade` : null].filter(Boolean).join(' · ')}</span>
                            : null}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </main>
  )
}
