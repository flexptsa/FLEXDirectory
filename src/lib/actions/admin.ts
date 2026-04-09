'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

async function requireAdmin(minRole: 'moderator' | 'super_admin' = 'moderator') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', supabase, user: null }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_approved')
    .eq('id', user.id)
    .single()

  const validRoles = minRole === 'super_admin'
    ? ['super_admin']
    : ['moderator', 'super_admin']

  if (!profile || !validRoles.includes(profile.role)) {
    return { error: 'Insufficient permissions', supabase, user: null }
  }
  return { error: null, supabase, user, role: profile.role }
}

// ─── Access requests ──────────────────────────────────────────────────────────

export async function approveAccessRequest(requestId: string, userId: string): Promise<ActionResult> {
  const { error, supabase, user } = await requireAdmin('super_admin')
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  // Approve in one transaction via two updates
  const { error: reqError } = await supabase
    .from('access_requests')
    .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)

  if (reqError) return { success: false, error: reqError.message }

  const { error: userError } = await supabase
    .from('users')
    .update({ is_approved: true, role: 'parent' })
    .eq('id', userId)

  if (userError) return { success: false, error: userError.message }

  revalidatePath('/admin/requests')
  return { success: true }
}

export async function rejectAccessRequest(
  requestId: string,
  reason?: string
): Promise<ActionResult> {
  const { error, supabase, user } = await requireAdmin('super_admin')
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const { error: reqError } = await supabase
    .from('access_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason ?? null,
    })
    .eq('id', requestId)

  if (reqError) return { success: false, error: reqError.message }

  revalidatePath('/admin/requests')
  return { success: true }
}

// ─── Photo moderation ─────────────────────────────────────────────────────────

export async function approveStudentPhoto(
  studentId: string,
  photoUrl: string,
  familyId: string
): Promise<ActionResult> {
  const { error, supabase, user } = await requireAdmin('moderator')
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const { error: studentError } = await supabase
    .from('students')
    .update({ student_photo_status: 'approved' })
    .eq('id', studentId)

  if (studentError) return { success: false, error: studentError.message }

  await supabase.from('photo_moderation_log').insert({
    family_id: familyId,
    student_id: studentId,
    photo_type: 'student',
    photo_url: photoUrl,
    action: 'approved',
    reviewed_by_user_id: user.id,
  })

  revalidatePath('/admin/photos')
  revalidatePath('/directory')
  return { success: true }
}

export async function hidePhoto(
  studentId: string,
  photoUrl: string,
  familyId: string,
  note?: string
): Promise<ActionResult> {
  const { error, supabase, user } = await requireAdmin('moderator')
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const { error: studentError } = await supabase
    .from('students')
    .update({ student_photo_status: 'hidden', show_student_photo: false })
    .eq('id', studentId)

  if (studentError) return { success: false, error: studentError.message }

  await supabase.from('photo_moderation_log').insert({
    family_id: familyId,
    student_id: studentId,
    photo_type: 'student',
    photo_url: photoUrl,
    action: 'hidden',
    admin_note: note ?? null,
    reviewed_by_user_id: user.id,
  })

  revalidatePath('/admin/photos')
  revalidatePath('/directory')
  return { success: true }
}

// ─── User management (super_admin only) ──────────────────────────────────────

export async function updateUserRole(
  targetUserId: string,
  newRole: 'parent' | 'moderator' | 'super_admin'
): Promise<ActionResult> {
  const { error, supabase, user } = await requireAdmin('super_admin')
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }
  if (targetUserId === user.id) return { success: false, error: 'Cannot change your own role.' }

  const { error: updateError } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath('/admin/users')
  return { success: true }
}

export async function revokeAccess(targetUserId: string): Promise<ActionResult> {
  const { error, supabase, user } = await requireAdmin('super_admin')
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }
  if (targetUserId === user.id) return { success: false, error: 'Cannot revoke your own access.' }

  const { error: updateError } = await supabase
    .from('users')
    .update({ is_approved: false, role: 'pending' })
    .eq('id', targetUserId)

  if (updateError) return { success: false, error: updateError.message }
  revalidatePath('/admin/users')
  return { success: true }
}
