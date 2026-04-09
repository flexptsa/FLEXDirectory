import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentForm } from '../StudentForm'

export default async function NewStudentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: family } = await supabase.from('families').select('id').eq('owner_user_id', user.id).single()
  if (!family) redirect('/account/family/edit')

  const [{ data: pursuitTags }, { data: clubTags }] = await Promise.all([
    supabase.from('pursuit_tags').select('*').order('name'),
    supabase.from('club_tags').select('*').order('name'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add student</h1>
        <p className="text-muted-foreground text-sm">Add a student profile to your family's directory listing.</p>
      </div>
      <StudentForm student={null} familyId={family.id} pursuitTags={pursuitTags ?? []} clubTags={clubTags ?? []} />
    </div>
  )
}
