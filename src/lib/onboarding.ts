export type OnboardingRole = string | null | undefined

export interface OnboardingState {
  isApproved: boolean
  role: OnboardingRole
  requiresOnboarding: boolean
  familyId: string | null
  familyCount: number
  parentCount: number
  studentCount: number
  isComplete: boolean
}

const FAMILY_ONBOARDING_ROLES = new Set(['parent'])

export function roleRequiresFamilyOnboarding(role: OnboardingRole) {
  return FAMILY_ONBOARDING_ROLES.has(role ?? '')
}

export async function getOnboardingState(
  supabase: any,
  userId: string,
  profile?: { is_approved: boolean | null; role: OnboardingRole } | null
): Promise<OnboardingState> {
  const resolvedProfile = profile ?? (await supabase
    .from('users')
    .select('is_approved, role')
    .eq('id', userId)
    .single()).data

  const isApproved = !!resolvedProfile?.is_approved
  const role = resolvedProfile?.role ?? null
  const requiresOnboarding = isApproved && roleRequiresFamilyOnboarding(role)

  if (!requiresOnboarding) {
    return {
      isApproved,
      role,
      requiresOnboarding,
      familyId: null,
      familyCount: 0,
      parentCount: 0,
      studentCount: 0,
      isComplete: true,
    }
  }

  const { data: families } = await supabase
    .from('families')
    .select('id')
    .eq('owner_user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const familyIds = (families ?? []).map((family: { id: string }) => family.id)
  const familyId = familyIds[0] ?? null

  if (!familyId) {
    return {
      isApproved,
      role,
      requiresOnboarding,
      familyId: null,
      familyCount: 0,
      parentCount: 0,
      studentCount: 0,
      isComplete: false,
    }
  }

  const [{ count: parentCount }, { count: studentCount }] = await Promise.all([
    supabase
      .from('parents')
      .select('*', { count: 'exact', head: true })
      .in('family_id', familyIds),
    supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .in('family_id', familyIds),
  ])

  const resolvedParentCount = parentCount ?? 0
  const resolvedStudentCount = studentCount ?? 0

  return {
    isApproved,
    role,
    requiresOnboarding,
    familyId,
    familyCount: familyIds.length,
    parentCount: resolvedParentCount,
    studentCount: resolvedStudentCount,
    isComplete: resolvedParentCount > 0 && resolvedStudentCount > 0,
  }
}
