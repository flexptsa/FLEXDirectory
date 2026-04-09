import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { ProfileParentForm } from '../ProfileParentForm'

export default async function ProfileEditParentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: family } = await supabase
    .from('families').select('id').eq('owner_user_id', user.id).single()
  if (!family) redirect('/account/profile/family')

  const { data: parent } = await supabase
    .from('parents').select('*').eq('id', id).eq('family_id', family.id).single()
  if (!parent) notFound()

  const signedPhotoUrl = parent.photo_url ? await getSignedUrl(parent.photo_url) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">Edit parent</h1>
        <p className="text-sm text-slate-500">
          {parent.first_name}{parent.last_name ? ` ${parent.last_name}` : ''}
        </p>
      </div>
      <ProfileParentForm
        parent={parent}
        familyId={family.id}
        displayOrder={parent.display_order}
        signedPhotoUrl={signedPhotoUrl}
      />
    </div>
  )
}
