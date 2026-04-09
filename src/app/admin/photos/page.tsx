import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { PhotoModerationButtons } from './PhotoModerationButtons'

interface PendingStudent {
  id: string
  first_name: string
  last_name: string | null
  student_photo_url: string
  family_id: string
  family: { family_display_name: string } | null
  signedUrl: string | null
}

export default async function PhotosPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('students')
    .select('id, first_name, last_name, student_photo_url, family_id, family:families(family_display_name)')
    .eq('student_photo_status', 'pending')
    .not('student_photo_url', 'is', null)
    .order('created_at', { ascending: true })

  const rows = data ?? []

  const students: PendingStudent[] = await Promise.all(
    rows.map(async (s: any) => ({
      ...s,
      signedUrl: s.student_photo_url ? await getSignedUrl(s.student_photo_url) : null,
    }))
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">Photo moderation</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {students.length === 0 ? 'No photos pending review.' : `${students.length} photo${students.length !== 1 ? 's' : ''} pending`}
        </p>
      </div>

      {students.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              <div className="aspect-[4/5] bg-slate-100">
                {student.signedUrl ? (
                  <img
                    src={student.signedUrl}
                    alt={`${student.first_name} ${student.last_name ?? ''}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                    No preview
                  </div>
                )}
              </div>
              <div className="px-3 py-3">
                <p className="font-medium text-slate-900 text-sm truncate">
                  {student.first_name}{student.last_name ? ` ${student.last_name}` : ''}
                </p>
                {student.family && (
                  <p className="text-xs text-slate-500 truncate">{student.family.family_display_name}</p>
                )}
                <PhotoModerationButtons
                  studentId={student.id}
                  photoUrl={student.student_photo_url}
                  familyId={student.family_id}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
