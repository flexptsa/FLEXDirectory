import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentForm } from '@/app/account/students/StudentForm'

export default async function ProfileNewStudentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: family } = await supabase
    .from('families').select('id').eq('owner_user_id', user.id).single()
  if (!family) redirect('/account/profile/family')

  const [{ data: pursuitTags }, { data: clubTags }] = await Promise.all([
    supabase.from('pursuit_tags').select('*').order('name'),
    supabase.from('club_tags').select('*').order('name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">Add student</h1>
        <p className="text-sm text-slate-500">Add a student profile to your family's directory listing.</p>
      </div>
      <StudentForm
        student={null}
        familyId={family.id}
        pursuitTags={pursuitTags ?? []}
        clubTags={clubTags ?? []}
        redirectTo="/account/profile/students"
      />
    </div>
  )
}
