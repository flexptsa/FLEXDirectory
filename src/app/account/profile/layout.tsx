import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileTabNav } from './ProfileTabNav'

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('users').select('is_approved').eq('id', user.id).single()
  if (!profile?.is_approved) redirect('/auth/waiting')

  return (
    <div>
      <ProfileTabNav />
      <div className="pt-6">{children}</div>
    </div>
  )
}
