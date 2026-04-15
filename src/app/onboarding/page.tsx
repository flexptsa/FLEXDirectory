import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSignedUrl } from '@/lib/actions/photo'
import { getOnboardingState } from '@/lib/onboarding'
import { OnboardingFlow } from './OnboardingFlow'

interface OnboardingPageProps {
  searchParams: Promise<{
    success?: string
    step?: string
  }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('users')
    .select('is_approved, role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_approved) redirect('/auth/waiting')

  const state = await getOnboardingState(supabase, user.id, profile)
  if (!state.requiresOnboarding) redirect('/directory')
  if (state.isComplete && params.success !== '1' && params.step !== 'student') redirect('/directory')

  const { data: family } = await supabase
    .from('families')
    .select('*')
    .eq('owner_user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const [{ data: parents }, { data: students }, { data: pursuitTags }, { data: clubTags }] = await Promise.all([
    family
      ? supabase
          .from('parents')
          .select('*')
          .eq('family_id', family.id)
          .order('display_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    family
      ? supabase
          .from('students')
          .select('id, first_name, last_name, grade, primary_pursuit, student_photo_url, show_student_photo')
          .eq('family_id', family.id)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from('pursuit_tags').select('*').order('name'),
    supabase.from('club_tags').select('*').order('name'),
  ])

  const familyPhotoUrl = family?.photo_url ? await getSignedUrl(family.photo_url) : null
  const parentPhotoUrls: Record<string, string | null> = {}
  for (const parent of parents ?? []) {
    parentPhotoUrls[parent.id] = parent.photo_url ? await getSignedUrl(parent.photo_url) : null
  }
  const studentPhotoUrls: Record<string, string | null> = {}
  for (const student of students ?? []) {
    studentPhotoUrls[student.id] =
      student.show_student_photo && student.student_photo_url
        ? await getSignedUrl(student.student_photo_url)
        : null
  }

  const initialStep =
    params.success === '1' && state.isComplete
      ? 'success'
      : params.step === 'student' && family && (parents ?? []).length > 0
      ? 'student'
      : !family
      ? 'welcome'
      : (parents ?? []).length === 0
      ? 'parent'
      : (students ?? []).length === 0
      ? 'student'
      : 'success'

  return (
    <OnboardingFlow
      userEmail={user.email ?? ''}
      initialStep={initialStep}
      initialFamily={family ?? null}
      initialParents={parents ?? []}
      initialStudents={students ?? []}
      pursuitTags={pursuitTags ?? []}
      clubTags={clubTags ?? []}
      familyPhotoUrl={familyPhotoUrl}
      parentPhotoUrls={parentPhotoUrls}
      studentPhotoUrls={studentPhotoUrls}
    />
  )
}
