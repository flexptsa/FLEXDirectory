'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

async function getApprovedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', supabase, user: null }
  const { data: profile } = await supabase.from('users').select('is_approved').eq('id', user.id).single()
  if (!profile?.is_approved) return { error: 'Access not approved', supabase, user: null }
  return { error: null, supabase, user }
}

interface UploadPhotoBase64Params {
  base64: string
  mimeType: 'image/jpeg' | 'image/png'
  type: 'family' | 'parent' | 'student'
  familyId: string
  parentId?: string  // required when type === 'parent'
  studentId?: string // required when type === 'student'
}

export async function uploadPhotoBase64(params: UploadPhotoBase64Params): Promise<ActionResult> {
  const { base64, mimeType, type, familyId, parentId, studentId } = params

  const { error, supabase, user } = await getApprovedUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  // Verify family ownership
  const { data: family } = await supabase
    .from('families')
    .select('owner_user_id')
    .eq('id', familyId)
    .single()
  if (family?.owner_user_id !== user.id) return { success: false, error: 'Unauthorized' }

  // Validate required IDs
  if (type === 'parent' && !parentId) return { success: false, error: 'parentId is required for parent photo uploads.' }
  if (type === 'student' && !studentId) return { success: false, error: 'studentId is required for student photo uploads.' }


  // Decode base64 to buffer
  const inputBuffer = Buffer.from(base64, 'base64')

  // Check size (5MB limit on original)
  if (inputBuffer.length > 5 * 1024 * 1024) {
    return { success: false, error: 'File must be under 5 MB.' }
  }

  // Resize with sharp
  let resizedBuffer: Buffer
  try {
    const sharp = (await import('sharp')).default
    resizedBuffer = await sharp(inputBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
  } catch (err) {
    console.error('SHARP ERROR:', err)
    return { success: false, error: 'Image processing failed.' }
  }

  // Build storage path
  const storagePath =
    type === 'family'
      ? `family-photos/${familyId}/profile.jpg`
      : type === 'parent'
      ? `parent-photos/${familyId}/${parentId}.jpg`
      : `student-photos/${familyId}/${studentId}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('flex-photos')
    .upload(storagePath, resizedBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    })

  if (uploadError) {
    console.error('UPLOAD ERROR:', uploadError)
    return { success: false, error: uploadError.message }
  }

  // Update DB
  let dbError: { message: string } | null = null

  if (type === 'family') {
    const { error } = await supabase
      .from('families')
      .update({ photo_url: storagePath })
      .eq('id', familyId)
    dbError = error
  } else if (type === 'parent' && parentId) {
    const { error } = await supabase
      .from('parents')
      .update({ photo_url: storagePath })
      .eq('id', parentId)
    dbError = error
  } else if (type === 'student' && studentId) {
    const { error } = await supabase
      .from('students')
      .update({
        student_photo_url: storagePath,
        student_photo_status: 'approved',
        show_student_photo: true,
      })
      .eq('id', studentId)
      .eq('family_id', familyId)
    dbError = error
  }

  if (dbError) {
    console.error('DB UPDATE ERROR:', dbError)
    return { success: false, error: `Photo uploaded but profile update failed: ${dbError.message}` }
  }

  revalidatePath('/account/students')
  revalidatePath('/account/family/edit')
  revalidatePath('/directory')
  return { success: true }
}

export async function removePhoto({
  type,
  familyId,
  parentId,
  studentId,
}: {
  type: 'family' | 'parent' | 'student'
  familyId: string
  parentId?: string
  studentId?: string
}): Promise<ActionResult> {
  const { error, supabase, user } = await getApprovedUser()
  if (error || !user) return { success: false, error: error ?? 'Unauthorized' }

  const { data: family } = await supabase
    .from('families')
    .select('owner_user_id')
    .eq('id', familyId)
    .single()
  if (family?.owner_user_id !== user.id) return { success: false, error: 'Unauthorized' }

  const storagePath =
    type === 'family'
      ? `family-photos/${familyId}/profile.jpg`
      : type === 'parent'
      ? `parent-photos/${familyId}/${parentId}.jpg`
      : `student-photos/${familyId}/${studentId}.jpg`

  await supabase.storage.from('flex-photos').remove([storagePath])

  if (type === 'family') {
    await supabase.from('families').update({ photo_url: null }).eq('id', familyId)
  } else if (type === 'parent' && parentId) {
    await supabase.from('parents').update({ photo_url: null }).eq('id', parentId)
  } else if (type === 'student' && studentId) {
    await supabase
      .from('students')
      .update({ student_photo_url: null, student_photo_status: 'none', show_student_photo: false })
      .eq('id', studentId)
      .eq('family_id', familyId)
  }

  revalidatePath('/account/students')
  revalidatePath('/account/family/edit')
  revalidatePath('/directory')
  return { success: true }
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase.storage
    .from('flex-photos')
    .createSignedUrl(storagePath, 60 * 60)

  return data?.signedUrl ?? null
}
