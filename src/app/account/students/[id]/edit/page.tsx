import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { StudentForm } from '../../StudentForm'

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: family } = await supabase.from('families').select('id').eq('owner_user_id', user.id).single()
  const familyId = family?.id
  if (!familyId) redirect('/account/family/edit')

  const { data: student } = await supabase.from('students').select('*').eq('id', id).eq('family_id', familyId).single()
  if (!student) notFound()

  const studentPhotoSignedUrl = student.student_photo_url ? await getSignedUrl(student.student_photo_url) : null

  const [{ data: pursuitTags }, { data: clubTags }, { data: studentClubs }] = await Promise.all([
    supabase.from('pursuit_tags').select('*').order('name'),
    supabase.from('club_tags').select('*').order('name'),
    supabase.from('student_clubs').select('club_tag_id').eq('student_id', id),
  ])

  const selectedClubIds = (studentClubs ?? []).map((sc: any) => sc.club_tag_id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit student profile</h1>
        <p className="text-muted-foreground text-sm">{student.first_name}{student.last_name ? ` ${student.last_name}` : ''}</p>
      </div>
      <StudentForm
        student={student}
        familyId={familyId}
        pursuitTags={pursuitTags ?? []}
        clubTags={clubTags ?? []}
        selectedClubIds={selectedClubIds}
        studentPhotoSignedUrl={studentPhotoSignedUrl}
      />
    </div>
  )
}
