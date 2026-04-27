import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'

export default async function ProfileReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: family } = await supabase
    .from('families')
    .select(`
      id, family_display_name, family_bio, photo_url,
      parents(id, first_name, last_name, photo_url, show_photo, email, phone, show_email, show_phone, display_order),
      students(id, first_name, last_name, grade, primary_pursuit, student_photo_url, show_student_photo, is_listed_in_directory)
    `)
    .eq('owner_user_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (!family) redirect('/account/profile/family')

  const sortedParents = [...(family.parents ?? [])].sort((a: any, b: any) => a.display_order - b.display_order)
  const listedStudents = (family.students ?? []).filter((s: any) => s.is_listed_in_directory)

  const fallbackParent = sortedParents.find((p: any) => p.show_photo && p.photo_url) as any | undefined
  const familyAvatarUrl = family.photo_url
    ? await getSignedUrl(family.photo_url)
    : fallbackParent ? await getSignedUrl(fallbackParent.photo_url) : null

  const parentPhotoUrls: Record<string, string | null> = {}
  for (const p of sortedParents as any[]) {
    parentPhotoUrls[p.id] = p.show_photo && p.photo_url
      ? await getSignedUrl(p.photo_url) : null
  }

  const studentPhotoUrls: Record<string, string | null> = {}
  for (const s of listedStudents as any[]) {
    studentPhotoUrls[s.id] = s.show_student_photo && s.student_photo_url
      ? await getSignedUrl(s.student_photo_url) : null
  }

  const parentNames = sortedParents
    .map((p: any) => `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`)
    .join(' & ')

  const funFacts = (family.family_bio ?? '')
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">Preview your profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">This is how your family appears to other directory members.</p>
      </div>

      {/* Profile preview */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-32 bg-gradient-to-r from-[#002554] to-[#003a7a] sm:h-40" />

        <div className="px-5 pb-8 sm:px-8 sm:pb-10">
          <div className="-mt-14 flex flex-col items-center text-center sm:-mt-16">
            <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-slate-100 ring-2 ring-[#CB9700] shadow-md sm:h-32 sm:w-32">
              {familyAvatarUrl ? (
                <img src={familyAvatarUrl} alt={family.family_display_name} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <svg className="h-12 w-12 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </div>
              )}
            </div>

            <div className="mt-4 space-y-1">
              <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                The {family.family_display_name} Family
              </h2>
              {parentNames && (
                <p className="text-base text-slate-500">{parentNames}</p>
              )}
            </div>
          </div>

          {(sortedParents.length > 0 || listedStudents.length > 0 || funFacts.length > 0) && (
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              {sortedParents.length > 0 && (
                <section className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="border-l-4 border-[#CB9700] pl-2 text-sm font-semibold uppercase tracking-wide text-[#002554]">
                    Parents &amp; Guardians
                  </h3>
                  <div className="mt-4 space-y-3">
                    {(sortedParents as any[]).map((parent) => (
                      <div key={parent.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          {parentPhotoUrls[parent.id] ? (
                            <img src={parentPhotoUrls[parent.id]!} alt={parent.first_name} className="h-full w-full object-cover object-top" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <svg className="h-6 w-6 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">
                            {parent.first_name}{parent.last_name ? ` ${parent.last_name}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {listedStudents.length > 0 && (
                <section className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="border-l-4 border-[#CB9700] pl-2 text-sm font-semibold uppercase tracking-wide text-[#002554]">
                    Students
                  </h3>
                  <div className="mt-4 space-y-3">
                    {(listedStudents as any[]).map((s) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          {studentPhotoUrls[s.id] ? (
                            <img src={studentPhotoUrls[s.id]!} alt={s.first_name} className="h-full w-full object-cover object-top" />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <svg className="h-6 w-6 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">
                            {s.first_name}{s.last_name ? ` ${s.last_name}` : ''}
                          </p>
                          <p className="text-sm text-slate-500">
                            {s.primary_pursuit && <span className="text-[#002554]">{s.primary_pursuit}</span>}
                            {s.grade && <span className="text-slate-400"> · </span>}
                            {s.grade && <span className="text-[#A67C00]">{s.grade} Grade</span>}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {funFacts.length > 0 && (
                <section className="rounded-2xl bg-slate-50 p-4 lg:col-span-2">
                  <h3 className="border-l-4 border-[#CB9700] pl-2 text-sm font-semibold uppercase tracking-wide text-[#002554]">
                    Fun Facts
                  </h3>
                  <ul className="mt-3 space-y-2 text-base text-slate-700">
                    {funFacts.map((fact: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CB9700]" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="text-slate-500">Make changes:</span>
          <Link href="/account/profile/family" className="text-[#002554] hover:underline">Family</Link>
          <span className="text-slate-300">·</span>
          <Link href="/account/profile/parents" className="text-[#002554] hover:underline">Parents</Link>
          <span className="text-slate-300">·</span>
          <Link href="/account/profile/students" className="text-[#002554] hover:underline">Students</Link>
        </div>
        <Link
          href="/directory"
          className="inline-flex items-center gap-1.5 bg-[#002554] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#003a7a] transition"
        >
          Looks good — go to directory →
        </Link>
      </div>
    </div>
  )
}
