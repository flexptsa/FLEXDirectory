import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { ContactForm } from '@/components/ContactForm'
import Link from 'next/link'
import { ChevronRight, MapPin } from 'lucide-react'

export default async function FamilyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: family } = await supabase
    .from('families')
    .select(`
      id, family_display_name, general_location, family_bio, photo_url,
      show_location, open_to_carpool, open_to_study_groups, open_to_social_meetups,
      deleted_at,
      parents(id, first_name, last_name, photo_url, show_photo, email, phone, show_email, show_phone, display_order),
      students(id, first_name, last_name, grade, primary_pursuit,
               student_photo_url, show_student_photo, is_listed_in_directory)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!family) notFound()

  const sortedParents = [...(family.parents ?? [])].sort((a, b) => a.display_order - b.display_order)
  const listedStudents = (family.students ?? []).filter((s: any) => s.is_listed_in_directory)

  const fallbackParent = sortedParents.find((p: any) => p.show_photo && p.photo_url) as any | undefined
  const familyAvatarUrl = family.photo_url
    ? await getSignedUrl(family.photo_url)
    : fallbackParent ? await getSignedUrl(fallbackParent.photo_url) : null

  const parentPhotoUrls: Record<string, string | null> = {}
  for (const p of sortedParents) {
    parentPhotoUrls[p.id] = p.show_photo && p.photo_url
      ? await getSignedUrl(p.photo_url) : null
  }

  const studentPhotoUrls: Record<string, string | null> = {}
  for (const s of listedStudents) {
    studentPhotoUrls[s.id] = s.show_student_photo && s.student_photo_url
      ? await getSignedUrl(s.student_photo_url) : null
  }

  const parentNames = sortedParents
    .map((p: any) => `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`)
    .join(' & ')

  const openTo = [
    family.open_to_carpool && 'Carpool',
    family.open_to_study_groups && 'Study groups',
    family.open_to_social_meetups && 'Social meetups',
  ].filter(Boolean) as string[]

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-8 pt-0 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          {/* Hero banner */}
          <div className="h-40 bg-gradient-to-r from-[#002554] to-[#003a7a] sm:h-48" />

          <div className="px-5 pb-8 sm:px-8 sm:pb-10">

            {/* Avatar + name centered, overlapping banner */}
            <div className="-mt-16 flex flex-col items-center text-center sm:-mt-20">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-slate-100 ring-2 ring-[#CB9700] shadow-md sm:h-36 sm:w-36">
                {familyAvatarUrl ? (
                  <img
                    src={familyAvatarUrl}
                    alt={family.family_display_name}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg className="h-14 w-14 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-1">
                <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">
                  The {family.family_display_name} Family
                </h1>
                {parentNames && (
                  <p className="text-lg text-slate-500">{parentNames}</p>
                )}
              </div>

              {/* Location + open-to tags */}
              {(family.show_location && family.general_location || openTo.length > 0) && (
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
                  {family.show_location && family.general_location && (
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {family.general_location}
                    </span>
                  )}
                  {openTo.map(tag => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Open to {tag}
                    </span>
                  ))}
                </div>
              )}




            </div>

            {/* Parents & Students sections */}
            {(sortedParents.length > 0 || listedStudents.length > 0) && (
              <div className="mt-8 grid gap-4 lg:grid-cols-2">

                {/* Parents */}
                {sortedParents.length > 0 && (
                  <section className="rounded-2xl bg-slate-50 p-4">
                    <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]"><span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                      Parents &amp; Guardians
                    </h2>
                    <div className="mt-4 space-y-3">
                      {sortedParents.map((parent: any) => (
                        <Link key={parent.id} href={`/directory/parents/${parent.id}`} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 transition hover:bg-slate-50">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                            {parentPhotoUrls[parent.id] ? (
                              <img
                                src={parentPhotoUrls[parent.id]!}
                                alt={`${parent.first_name}${parent.last_name ? ' ' + parent.last_name : ''}`}
                                className="h-full w-full object-cover object-top"
                              />
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
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Students */}
                {listedStudents.length > 0 && (
                  <section className="rounded-2xl bg-slate-50 p-4">
                    <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]"><span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                      Students
                    </h2>
                    <div className="mt-4 space-y-3">
                      {listedStudents.map((s: any) => (
                        <Link
                          key={s.id}
                          href={`/directory/students/${s.id}`}
                          className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 transition hover:bg-slate-50"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100">
                            {studentPhotoUrls[s.id] ? (
                              <img
                                src={studentPhotoUrls[s.id]!}
                                alt={`${s.first_name}${s.last_name ? ' ' + s.last_name : ''}`}
                                className="h-full w-full object-cover object-top"
                              />
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
                              <span className="text-[#002554]">{s.primary_pursuit}</span>
                              {s.grade && <span className="text-slate-400"> · </span>}
                              {s.grade && <span className="text-[#A67C00]">{s.grade} Grade</span>}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
{family.family_bio && family.family_bio.trim() && (() => {
                const facts = family.family_bio.split('\n').map((l: string) => l.trim()).filter(Boolean)
                return facts.length > 0 ? (
                  <section className="mt-4 rounded-2xl bg-slate-50 p-4 lg:col-span-2">
                    <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]"><span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                      Fun Facts
                    </h2>
                    <ul className="mt-3 space-y-2 text-base text-slate-700">
                      {facts.map((fact: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CB9700]" />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null
              })()}
            



              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
