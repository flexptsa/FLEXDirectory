'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { ActionResult, FamilyFormData, ParentFormData } from '@/types'

async function getApprovedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', supabase, user: null }

  const { data: profile } = await supabase
    .from('users')
    .select('is_approved, role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_approved) return { error: 'Access not approved', supabase, user: null }
  return { error: null, supabase, user, role: profile.role }
}

async function verifyFamilyOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('families')
    .select('owner_user_id')
    .eq('id', familyId)
    .single()
  return data?.owner_user_id === userId
}

// ─── Family ───────────────────────────────────────────────────────────────────

export async function upsertFamily(
  familyId: string | null,
  data: FamilyFormData
): Promise<ActionResult & { familyId?: string }> {
  const { error, supabase, user } = await getApprovedUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const payload = {
    owner_user_id: user.id,
    family_display_name: data.family_display_name.trim(),
    general_location: data.general_location.trim() || null,
    family_bio: data.family_bio.trim() || null,
    show_location: data.show_location,
    open_to_carpool: data.open_to_carpool,
    open_to_study_groups: data.open_to_study_groups,
    open_to_social_meetups: data.open_to_social_meetups,
  }

  if (familyId) {
    const isOwner = await verifyFamilyOwnership(supabase, familyId, user.id)
    if (!isOwner) return { success: false, error: 'Unauthorized' }

    const { error: updateError } = await supabase
      .from('families')
      .update(payload)
      .eq('id', familyId)

    if (updateError) return { success: false, error: updateError.message }
    revalidatePath('/account/family/edit')
    revalidatePath('/directory')
    return { success: true, familyId }
  } else {
    const { data: newFamily, error: insertError } = await supabase
      .from('families')
      .insert(payload)
      .select('id')
      .single()

    if (insertError) return { success: false, error: insertError.message }
    revalidatePath('/account/family/edit')
    revalidatePath('/directory')
    return { success: true, familyId: newFamily.id }
  }
}

export async function softDeleteFamily(familyId: string): Promise<ActionResult> {
  const { error, supabase, user } = await getApprovedUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { error: updateError } = await supabase
    .from('families')
    .update({ deleted_at: new Date().toISOString(), purge_after: purgeAfter })
    .eq('id', familyId)
    .eq('owner_user_id', user.id)

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath('/account/family/edit')
  revalidatePath('/directory')
  return { success: true }
}

export async function cancelFamilyDeletion(familyId: string): Promise<ActionResult> {
  const { error, supabase, user } = await getApprovedUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const { error: updateError } = await supabase
    .from('families')
    .update({ deleted_at: null, purge_after: null })
    .eq('id', familyId)
    .eq('owner_user_id', user.id)

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath('/account/family/edit')
  revalidatePath('/directory')
  return { success: true }
}

// ─── Parents ──────────────────────────────────────────────────────────────────

export async function upsertParent(
  parentId: string | null,
  familyId: string,
  data: ParentFormData
): Promise<ActionResult & { parentId?: string }> {
  const { error, supabase, user } = await getApprovedUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const isOwner = await verifyFamilyOwnership(supabase, familyId, user.id)
  if (!isOwner) return { success: false, error: 'Unauthorized' }

  const payload = {
    family_id: familyId,
    first_name: data.first_name.trim(),
    last_name: data.last_name.trim() || null,
    email: data.email.trim() || null,
    phone: data.phone.trim() || null,
    show_email: data.show_email,
    show_phone: data.show_phone,
    show_on_student_profile: data.show_on_student_profile,
    show_photo: data.show_photo,
    invite_email: data.invite_email.trim() || null,
    display_order: data.display_order,
  }

  if (parentId) {
    const { error: updateError } = await supabase
      .from('parents')
      .update(payload)
      .eq('id', parentId)

    if (updateError) return { success: false, error: updateError.message }
    revalidatePath('/account/family/edit')
    revalidatePath('/directory')
    return { success: true, parentId }
  } else {
    const { data: newParent, error: insertError } = await supabase
      .from('parents')
      .insert(payload)
      .select('id')
      .single()

    if (insertError) return { success: false, error: insertError.message }
    revalidatePath('/account/family/edit')
    revalidatePath('/directory')
    return { success: true, parentId: newParent.id }
  }
}

export async function deleteParent(parentId: string): Promise<ActionResult> {
  const { error, supabase, user } = await getApprovedUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const { data: parent } = await supabase
    .from('parents')
    .select('family_id')
    .eq('id', parentId)
    .single()
  if (!parent) return { success: false, error: 'Not found' }

  const isOwner = await verifyFamilyOwnership(supabase, parent.family_id, user.id)
  if (!isOwner) return { success: false, error: 'Unauthorized' }

  const { error: deleteError } = await supabase
    .from('parents')
    .delete()
    .eq('id', parentId)

  if (deleteError) return { success: false, error: deleteError.message }
  revalidatePath('/account/family/edit')
  revalidatePath('/directory')
  return { success: true }
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function sendFamilyInvite(
  id: string,
  type: 'parent' | 'student',
  inviteEmail: string
): Promise<ActionResult> {
  const { error, supabase, user } = await getApprovedUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const trimmedEmail = inviteEmail.trim()
  if (!trimmedEmail) return { success: false, error: 'Invite email is required.' }

  // Verify ownership
  if (type === 'parent') {
    const { data: parent } = await supabase.from('parents').select('family_id').eq('id', id).single()
    if (!parent) return { success: false, error: 'Not found' }
    const isOwner = await verifyFamilyOwnership(supabase, parent.family_id, user.id)
    if (!isOwner) return { success: false, error: 'Unauthorized' }
  } else {
    const { data: student } = await supabase.from('students').select('family_id').eq('id', id).single()
    if (!student) return { success: false, error: 'Not found' }
    const isOwner = await verifyFamilyOwnership(supabase, student.family_id, user.id)
    if (!isOwner) return { success: false, error: 'Unauthorized' }
  }

  // Save invite_email on the record
  const table = type === 'parent' ? 'parents' : 'students'
  await supabase.from(table).update({ invite_email: trimmedEmail }).eq('id', id)

  // Send invite via Supabase Admin (service role)
  // Uses generateLink with type 'invite' which sends the email automatically
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email: trimmedEmail,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
    },
  })

  if (linkError) return { success: false, error: `Could not send invite: ${linkError.message}` }

  // Record sent timestamp
  await supabase.from(table).update({ invite_sent_at: new Date().toISOString() }).eq('id', id)

  revalidatePath('/account/family/edit')
  return { success: true }
}
