'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getOnboardingState } from '@/lib/onboarding'
import { uploadPhotoBase64 } from '@/lib/actions/photo'
import type { ActionResult } from '@/types'

type PhotoInput = {
  base64: string
  mimeType: 'image/jpeg' | 'image/png'
} | null

interface OnboardingParentInput {
  first_name: string
  last_name: string
  email: string
  phone: string
  show_email: boolean
  show_phone: boolean
  photo: PhotoInput
}

interface OnboardingStudentInput {
  first_name: string
  last_name: string
  grade: string
  pursuit: string
  clubIds: string[]
  photo: PhotoInput
}

async function getOnboardingUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', supabase, user: null }

  const { data: profile } = await supabase
    .from('users')
    .select('is_approved, role')
    .eq('id', user.id)
    .single()

  const state = await getOnboardingState(supabase, user.id, profile)
  if (!state.isApproved) return { error: 'Access not approved', supabase, user: null }
  if (!state.requiresOnboarding) return { error: 'Onboarding is not required for this account.', supabase, user: null }

  return { error: null, supabase, user, state }
}

async function verifyOwnedFamily(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, familyId: string) {
  const { data } = await supabase
    .from('families')
    .select('id')
    .eq('id', familyId)
    .eq('owner_user_id', userId)
    .is('deleted_at', null)
    .single()

  return !!data
}

export async function saveOnboardingFamily(input: {
  family_display_name: string
  photo: PhotoInput
}): Promise<ActionResult & { familyId?: string }> {
  const { error, supabase, user, state } = await getOnboardingUser()
  if (error || !user || !state) return { success: false, error: error ?? 'Unauthorized' }

  const familyName = input.family_display_name.trim()
  if (!familyName) return { success: false, error: 'Family name is required.' }

  const payload = {
    owner_user_id: user.id,
    family_display_name: familyName,
    general_location: null,
    family_bio: null,
    show_location: false,
    open_to_carpool: false,
    open_to_study_groups: false,
    open_to_social_meetups: false,
  }

  let familyId = state.familyId

  if (familyId) {
    const { error: updateError } = await supabase
      .from('families')
      .update(payload)
      .eq('id', familyId)
      .eq('owner_user_id', user.id)

    if (updateError) return { success: false, error: updateError.message }
  } else {
    const { data: family, error: insertError } = await supabase
      .from('families')
      .insert(payload)
      .select('id')
      .single()

    if (insertError) return { success: false, error: insertError.message }
    familyId = family.id
  }

  if (input.photo && familyId) {
    const photoResult = await uploadPhotoBase64({
      ...input.photo,
      type: 'family',
      familyId,
    })
    if (!photoResult.success) return { success: false, error: `Saved family, but photo upload failed: ${photoResult.error}` }
  }

  revalidatePath('/onboarding')
  revalidatePath('/directory')
  return { success: true, familyId: familyId ?? undefined }
}

export async function saveOnboardingParents(input: {
  familyId: string
  primary: OnboardingParentInput
  secondary: OnboardingParentInput | null
}): Promise<ActionResult> {
  const { error, supabase, user } = await getOnboardingUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const isOwner = await verifyOwnedFamily(supabase, user.id, input.familyId)
  if (!isOwner) return { success: false, error: 'Unauthorized' }

  if (!input.primary.first_name.trim()) return { success: false, error: 'Primary parent first name is required.' }

  const { data: existingParents } = await supabase
    .from('parents')
    .select('id, display_order')
    .eq('family_id', input.familyId)
    .order('display_order', { ascending: true })

  async function upsertParent(parent: OnboardingParentInput, displayOrder: number, parentId?: string) {
    const payload = {
      family_id: input.familyId,
      first_name: parent.first_name.trim(),
      last_name: parent.last_name.trim() || null,
      email: parent.email.trim() || null,
      phone: parent.phone.trim() || null,
      show_email: parent.show_email && !!parent.email.trim(),
      show_phone: parent.show_phone && !!parent.phone.trim(),
      show_on_student_profile: true,
      show_photo: true,
      invite_email: null,
      display_order: displayOrder,
    }

    if (parentId) {
      const { error: updateError } = await supabase
        .from('parents')
        .update(payload)
        .eq('id', parentId)
        .eq('family_id', input.familyId)
      if (updateError) return { success: false, error: updateError.message }
      return { success: true, parentId }
    }

    const { data: newParent, error: insertError } = await supabase
      .from('parents')
      .insert(payload)
      .select('id')
      .single()
    if (insertError) return { success: false, error: insertError.message }
    return { success: true, parentId: newParent.id }
  }

  const primaryResult = await upsertParent(input.primary, 1, existingParents?.[0]?.id)
  if (!primaryResult.success || !primaryResult.parentId) return primaryResult

  if (input.primary.photo) {
    const photoResult = await uploadPhotoBase64({
      ...input.primary.photo,
      type: 'parent',
      familyId: input.familyId,
      parentId: primaryResult.parentId,
    })
    if (!photoResult.success) return { success: false, error: `Saved parent, but photo upload failed: ${photoResult.error}` }
  }

  const secondaryHasContent = input.secondary
    ? Boolean(
        input.secondary.first_name.trim() ||
        input.secondary.last_name.trim() ||
        input.secondary.email.trim() ||
        input.secondary.phone.trim() ||
        input.secondary.photo
      )
    : false

  if (input.secondary && secondaryHasContent) {
    if (!input.secondary.first_name.trim()) return { success: false, error: 'Second parent first name is required if you add a second parent.' }

    const secondaryResult = await upsertParent(input.secondary, 2, existingParents?.[1]?.id)
    if (!secondaryResult.success || !secondaryResult.parentId) return secondaryResult

    if (input.secondary.photo) {
      const photoResult = await uploadPhotoBase64({
        ...input.secondary.photo,
        type: 'parent',
        familyId: input.familyId,
        parentId: secondaryResult.parentId,
      })
      if (!photoResult.success) return { success: false, error: `Saved second parent, but photo upload failed: ${photoResult.error}` }
    }
  }

  revalidatePath('/onboarding')
  revalidatePath('/directory')
  return { success: true }
}

export async function saveOnboardingStudent(input: {
  familyId: string
  student: OnboardingStudentInput
}): Promise<ActionResult & { studentId?: string }> {
  const { error, supabase, user } = await getOnboardingUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const isOwner = await verifyOwnedFamily(supabase, user.id, input.familyId)
  if (!isOwner) return { success: false, error: 'Unauthorized' }

  const student = input.student
  if (!student.first_name.trim() || !student.grade || !student.pursuit.trim()) {
    return { success: false, error: 'Student first name, grade, and pursuit are required.' }
  }

  const { data: newStudent, error: insertError } = await supabase
    .from('students')
    .insert({
      family_id: input.familyId,
      first_name: student.first_name.trim(),
      last_name: student.last_name.trim() || null,
      grade: student.grade,
      primary_pursuit: student.pursuit.trim(),
      secondary_pursuit: null,
      short_bio: null,
      organization: null,
      fun_facts: null,
      student_photo_status: student.photo ? 'approved' : 'none',
      is_listed_in_directory: true,
      show_student_photo: !!student.photo,
      invite_email: null,
    })
    .select('id')
    .single()

  if (insertError) return { success: false, error: insertError.message }

  if (student.clubIds.length > 0) {
    const { error: clubsError } = await supabase.from('student_clubs').insert(
      student.clubIds.map((clubId) => ({
        student_id: newStudent.id,
        club_tag_id: clubId,
      }))
    )
    if (clubsError) return { success: false, error: `Saved student, but clubs failed: ${clubsError.message}` }
  }

  if (student.photo) {
    const photoResult = await uploadPhotoBase64({
      ...student.photo,
      type: 'student',
      familyId: input.familyId,
      studentId: newStudent.id,
    })
    if (!photoResult.success) return { success: false, error: `Saved student, but photo upload failed: ${photoResult.error}` }
  }

  revalidatePath('/onboarding')
  revalidatePath('/directory')
  revalidatePath('/directory/students')
  return { success: true, studentId: newStudent.id }
}
