import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { ProfileFamilyForm } from './ProfileFamilyForm'

export default async function ProfileFamilyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: family } = await supabase
    .from('families')
    .select('*')
    .eq('owner_user_id', user.id)
    .order('created_at')
    .limit(1)
    .maybeSingle()

  const familyPhotoSignedUrl = family?.photo_url
    ? await getSignedUrl(family.photo_url)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002554]">
          {family ? 'Your family' : 'Set up your family'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {family
            ? 'Update your family name, fun facts, and photo.'
            : 'Create your family profile to appear in the directory.'}
        </p>
      </div>
      <ProfileFamilyForm family={family ?? null} familyPhotoSignedUrl={familyPhotoSignedUrl} />
    </div>
  )
}
