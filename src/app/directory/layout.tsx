import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/AppNav'
import { getOnboardingState } from '@/lib/onboarding'

export default async function DirectoryLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('users').select('is_approved, role').eq('id', user.id).single()
  if (!profile?.is_approved) redirect('/auth/waiting')

  const onboardingState = await getOnboardingState(supabase, user.id, profile)
  if (onboardingState.requiresOnboarding && !onboardingState.isComplete) redirect('/onboarding')

  return (
    <>
      <AppNav />
      {children}
    </>
  )
}
