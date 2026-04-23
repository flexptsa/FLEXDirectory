import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export default async function ParentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: parent } = await supabase
    .from('parents')
    .select(`
      id, first_name, last_name, photo_url, show_photo,
      email, show_email, phone, show_phone,
      family:families!inner(
        id, family_display_name, deleted_at,
        students(id, first_name, last_name, grade, primary_pursuit,
                 student_photo_url, show_student_photo, is_listed_in_directory)
      )
    `)
    .eq('id', id)
    .is('families.deleted_at', null)
    .single()

  if (!parent) notFound()

  const family = parent.family as any
  const listedStudents = (family.students ?? []).filter((s: any) => s.is_listed_in_directory)

  const parentPhotoUrl =
    parent.show_photo && parent.photo_url
      ? await getSignedUrl(parent.photo_url)
      : null

  const studentPhotoUrls: Record<string, string | null> = {}
  for (const s of listedStudents) {
    studentPhotoUrls[s.id] =
      s.show_student_photo && s.student_photo_url
        ? await getSignedUrl(s.student_photo_url)
        : null
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-8 pt-0 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          {/* Hero banner */}
          <div className="h-28 bg-gradient-to-r from-[#002554] to-[#003a7a] sm:h-36" />

          <div className="px-5 pb-8 sm:px-8 sm:pb-10">

            {/* Avatar + name centered, overlapping banner */}
            <div className="-mt-14 flex flex-col items-center text-center sm:-mt-16">
              <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white bg-slate-100 ring-2 ring-[#CB9700] shadow-md sm:h-36 sm:w-36">
                {parentPhotoUrl ? (
                  <img
                    src={parentPhotoUrl}
                    alt={`${parent.first_name}${parent.last_name ? ' ' + parent.last_name : ''}`}
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
                  {parent.first_name}{parent.last_name ? ` ${parent.last_name}` : ''}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
                  {parent.show_email && parent.email && (
                    <a
                      href={`mailto:${parent.email}`}
                      className="text-sky-700 hover:underline"
                    >
                      {parent.email}
                    </a>
                  )}
                  {parent.show_phone && parent.phone && (
                    <a
                      href={`tel:${parent.phone}`}
                      className="text-sky-700 hover:underline"
                    >
                      {parent.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Content sections */}
            <div className="mt-8 grid gap-4 lg:grid-cols-2">

              {/* Family */}
              <section className="rounded-2xl bg-slate-50 p-4">
                <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]"><span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                  Family
                </h2>
                <div className="mt-4">
                  <Link
                    href={`/directory/families/${family.id}`}
                    className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 transition hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">
                        The {family.family_display_name} Family
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </div>
              </section>

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

            </div>
          </div>
        </div>

      </div>
    </main>
  )
}
