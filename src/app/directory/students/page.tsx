import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { StudentCard } from '@/components/StudentCard'
import { PageHeader } from '@/components/PageHeader'
import type { StudentWithFamily } from '@/types'

interface PageProps {
  searchParams: Promise<{
    q?: string
    grade?: string | string[]
    pursuit?: string
    club?: string
    sort?: string
  }>
}

export default async function StudentsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()

  const q = params.q?.trim() ?? ''
  const grades = Array.isArray(params.grade) ? params.grade : params.grade ? [params.grade] : []
  const pursuit = params.pursuit ?? ''
  const club = params.club ?? ''

  let query = supabase
    .from('students')
    .select(`
      *,
      family:families!inner(
        id, family_display_name, general_location,
        show_location, open_to_carpool, open_to_study_groups, open_to_social_meetups,
        deleted_at
      ),
      clubs:student_clubs(club_tag:club_tags(id, name))
    `)
    .eq('is_listed_in_directory', true)
    .is('families.deleted_at', null)

  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,primary_pursuit.ilike.%${q}%`)
  if (grades.length > 0) query = query.in('grade', grades)
  if (pursuit) query = query.ilike('primary_pursuit', `%${pursuit}%`)
  if (params.sort === 'grade') query = query.order('grade').order('first_name')
  else query = query.order('first_name')

  let { data: students } = (await query) as { data: any[] | null }

  if (club && students) {
    students = students.filter(
      (s) => s.clubs?.some((c: any) => c.club_tag?.name === club)
    )
  }

  const studentsWithPhotos = await Promise.all(
    (students ?? []).map(async (s) => ({
      student: s as StudentWithFamily,
      photoUrl:
        s.show_student_photo &&
        s.student_photo_status === 'approved' &&
        s.student_photo_url
          ? await getSignedUrl(s.student_photo_url)
          : null,
    }))
  )

  const activeFilters = [q, ...grades, pursuit, club].filter(Boolean)

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
        <PageHeader
          title="Student Directory"
          subtitle="Crossroads FLEX PTSA"
        />

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
          <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search students by name, pursuit, club, grade level..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
            />
            <button
              type="submit"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Search
            </button>
          </form>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Filtering by:</span>
            {activeFilters.map((f) => (
              <span
                key={f}
                className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800"
              >
                {f}
              </span>
            ))}
            <a
              href="/directory/students"
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              Clear
            </a>
          </div>
        )}

        <p className="text-sm font-medium text-slate-500">
          {studentsWithPhotos.length} student{studentsWithPhotos.length !== 1 ? 's' : ''}
        </p>

        {studentsWithPhotos.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white py-16 text-center text-slate-400">
            <p className="text-base sm:text-lg">No students match your search.</p>
            <a
              href="/directory/students"
              className="mt-2 inline-block text-sm underline underline-offset-2"
            >
              Clear filters
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {studentsWithPhotos.map(({ student, photoUrl }) => (
              <StudentCard key={student.id} student={student} photoUrl={photoUrl} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}