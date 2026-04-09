import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/AppNav'

export default async function DirectoryLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('users').select('is_approved').eq('id', user.id).single()
  if (!profile?.is_approved) redirect('/auth/waiting')

  return (
    <>
      <AppNav />
      {children}
    </>
  )
}
