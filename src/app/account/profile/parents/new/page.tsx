import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileParentForm } from '../ProfileParentForm'

export default async function ProfileNewParentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: family } = await supabase
    .from('families').select('id').eq('owner_user_id', user.id).single()
  if (!family) redirect('/account/profile/family')

  const { count } = await supabase
    .from('parents')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', family.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">Add parent</h1>
        <p className="text-sm text-slate-500">Add a parent or guardian to your family profile.</p>
      </div>
      <ProfileParentForm
        parent={null}
        familyId={family.id}
        displayOrder={count ?? 0}
      />
    </div>
  )
}
