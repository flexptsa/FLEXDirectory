import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { ContactForm } from '@/components/ContactForm'
import Link from 'next/link'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: student } = await supabase
    .from('students')
    .select(`
      *,
      family:families!inner(
        id, family_display_name, general_location,
        show_location, open_to_carpool, open_to_study_groups, open_to_social_meetups,
        deleted_at, owner_user_id,
        parents(id, first_name, last_name, photo_url, show_photo, show_on_student_profile)
      ),
      clubs:student_clubs(club_tag:club_tags(id, name))
    `)
    .eq('id', id)
    .eq('is_listed_in_directory', true)
    .is('families.deleted_at', null)
    .single()

  if (!student) notFound()

  const { data: siblings } = await supabase
    .from('students')
    .select('id, first_name, last_name, student_photo_url, student_photo_status, show_student_photo')
    .eq('family_id', student.family_id)
    .eq('is_listed_in_directory', true)
    .neq('id', id)

  const studentPhotoUrl =
    student.show_student_photo &&
    student.student_photo_status === 'approved' &&
    student.student_photo_url
      ? await getSignedUrl(student.student_photo_url)
      : null

  const family = student.family as any
  const visibleParents = (family.parents ?? []).filter((p: any) => p.show_on_student_profile)

  const parentPhotoUrls: Record<string, string | null> = {}
  for (const p of visibleParents) {
    parentPhotoUrls[p.id] =
      p.show_photo && p.photo_url ? await getSignedUrl(p.photo_url) : null
  }

  const siblingPhotos: Record<string, string | null> = {}
  for (const sib of siblings ?? []) {
    siblingPhotos[sib.id] =
      sib.show_student_photo &&
      sib.student_photo_status === 'approved' &&
      sib.student_photo_url
        ? await getSignedUrl(sib.student_photo_url)
        : null
  }

  const clubNames = (student.clubs ?? [])
    .map((c: any) => c.club_tag?.name)
    .filter(Boolean)

  const facts = student.fun_facts
    ? student.fun_facts
        .split('\n')
        .map((f: string) => f.trim())
        .filter(Boolean)
    : []

  const familyMembers = [
    ...visibleParents.map((p: any) => ({
      key: `parent-${p.id}`,
      name: `${p.first_name}${p.last_name ? ' ' + p.last_name : ''}`,
      relation: 'Parent',
      photo: parentPhotoUrls[p.id],
      href: `/directory/families/${family.id}`,
    })),
    ...(siblings ?? []).map((sib) => ({
      key: `sibling-${sib.id}`,
      name: `${sib.first_name}${sib.last_name ? ' ' + sib.last_name : ''}`,
      relation: 'Sibling',
      photo: siblingPhotos[sib.id],
      href: `/directory/students/${sib.id}`,
    })),
  ]

  const connectionTags = [
    family.open_to_carpool ? 'Open to Carpool' : null,
    family.open_to_study_groups ? 'Open to Study Groups' : null,
    family.open_to_social_meetups ? 'Open to Social Meetups' : null,
  ].filter(Boolean)

  const detailItems = [
    {
      label: 'Grade',
      value: student.grade,
    },
    {
      label: 'Pursuit',
      value:
        student.primary_pursuit +
        (student.secondary_pursuit ? ` · ${student.secondary_pursuit}` : ''),
    },
    student.organization
      ? {
          label: 'Organization',
          value: student.organization,
        }
      : null,
    clubNames.length > 0
      ? {
          label: 'Clubs',
          value: clubNames.join(', '),
        }
      : null,
    family.show_location && family.general_location
      ? {
          label: 'Area',
          value: family.general_location,
        }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-8 pt-0 sm:px-6 sm:pb-10">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
          <div className="h-28 bg-gradient-to-r from-[#082B57] via-[#0A356B] to-[#0A2F5A] sm:h-36" />

          <div className="px-5 pb-6 sm:px-8 sm:pb-8 lg:px-10">
            <div className="-mt-14 flex flex-col items-center text-center sm:-mt-16">
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-[0_12px_24px_rgba(15,23,42,0.12)] ring-2 ring-[#CB9700] sm:h-32 sm:w-32">
                {studentPhotoUrl ? (
                  <img
                    src={studentPhotoUrl}
                    alt={`${student.first_name} ${student.last_name ?? ''}`}
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <svg
                      className="h-12 w-12 text-slate-300"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="mt-4 max-w-3xl">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-4xl">
                  {student.first_name} {student.last_name}
                </h1>

                <p className="mt-2 text-lg sm:text-xl">
                  <span className="font-semibold text-[#002554]">
                    {student.primary_pursuit}
                  </span>
                  <span className="mx-2 text-slate-300">•</span>
                  <span className="font-medium text-[#A67C00]">{student.grade} Grade</span>
                </p>

                {connectionTags.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {connectionTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]">
                  <span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                  Details
                </h2>

                <div className="mt-5 space-y-3.5">
                  {detailItems.map((item, index) => (
                    <div
                      key={item.label}
                      className={index === 0 ? '' : 'border-t border-slate-100 pt-3.5'}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-base font-medium leading-7 text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {familyMembers.length > 0 && (
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]">
                    <span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                    Family
                  </h2>

                  <div className="mt-5 space-y-3">
                    {familyMembers.map((member) => {
                      const content = (
                        <>
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-slate-200">
                            {member.photo ? (
                              <img
                                src={member.photo}
                                alt={member.name}
                                className="h-full w-full object-cover object-top"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <svg
                                  className="h-6 w-6 text-slate-300"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-slate-900">
                              {member.name}
                            </p>
                            <p className="text-sm font-medium text-slate-500">
                              {member.relation}
                            </p>
                          </div>

                          {'href' in member && member.href ? (
                            <span className="text-sm font-medium text-[#002554]">
                              View
                            </span>
                          ) : null}
                        </>
                      )

                      return 'href' in member && member.href ? (
                        <Link
                          key={member.key}
                          href={member.href as string}
                          className={
                            member.relation === 'Parent'
                              ? 'flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100'
                              : 'flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-sm'
                          }
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          key={member.key}
                          className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          {content}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>

            {facts.length > 0 && (
              <section className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.14em] text-[#002554]">
                  <span className="h-6 w-1 rounded-full bg-[#CB9700]/90" />
                  Fun Facts
                </h2>

                <ul className="mt-5 space-y-3">
                  {facts.map((fact: string, i: number) => (
                    <li key={i} className="flex gap-3 text-slate-700">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#CB9700]/90" />
                      <span className="text-base leading-7">{fact}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  Contact Family
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Reach out to the {family.family_display_name} about shared interests,
                  carpools, study groups, or general connection.
                </p>
              </div>

              <div className="mt-5">
                <ContactForm
                  recipientFamilyId={family.id}
                  recipientFamilyName={family.family_display_name}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}