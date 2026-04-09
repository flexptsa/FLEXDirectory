'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ActionResult, StudentFormData } from '@/types'

async function getOwnedFamily(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, familyId: string) {
  const { data } = await supabase
    .from('families').select('id, owner_user_id').eq('id', familyId).eq('owner_user_id', userId).single()
  return data
}

export async function upsertStudent(
  studentId: string | null,
  familyId: string,
  data: StudentFormData & { organization?: string; fun_facts?: string },
  clubIds: string[] = []
): Promise<ActionResult & { studentId?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const family = await getOwnedFamily(supabase, user.id, familyId)
  if (!family) return { success: false, error: 'Unauthorized' }

  const payload = {
    family_id: familyId,
    first_name: data.first_name.trim(),
    last_name: data.last_name?.trim() || null,
    grade: data.grade,
    primary_pursuit: data.primary_pursuit.trim(),
    secondary_pursuit: data.secondary_pursuit?.trim() || null,
    organization: data.organization?.trim() || null,
    fun_facts: data.fun_facts?.trim() || null,
    is_listed_in_directory: data.is_listed_in_directory,
    show_student_photo: data.show_student_photo,
  }

  let finalStudentId = studentId

  if (studentId) {
    const { error } = await supabase.from('students').update(payload).eq('id', studentId).eq('family_id', familyId)
    if (error) return { success: false, error: error.message }
  } else {
    const { data: newStudent, error } = await supabase.from('students').insert(payload).select('id').single()
    if (error) return { success: false, error: error.message }
    finalStudentId = newStudent.id
  }

  // Update clubs: delete existing, insert new
  if (finalStudentId) {
    await supabase.from('student_clubs').delete().eq('student_id', finalStudentId)
    if (clubIds.length > 0) {
      await supabase.from('student_clubs').insert(
        clubIds.map(club_tag_id => ({ student_id: finalStudentId, club_tag_id }))
      )
    }
  }

  revalidatePath('/account/students')
  revalidatePath(`/directory/students/${finalStudentId}`)
  revalidatePath('/directory/students')
  return { success: true, studentId: finalStudentId ?? undefined }
}

export async function deleteStudent(studentId: string, familyId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const family = await getOwnedFamily(supabase, user.id, familyId)
  if (!family) return { success: false, error: 'Unauthorized' }

  const { data: student } = await supabase.from('students').select('student_photo_url').eq('id', studentId).single()
  if (student?.student_photo_url) {
    await supabase.storage.from('flex-photos').remove([student.student_photo_url])
  }

  const { error } = await supabase.from('students').delete().eq('id', studentId).eq('family_id', familyId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/account/students')
  revalidatePath('/directory/students')
  return { success: true }
}

export async function toggleStudentListing(studentId: string, familyId: string, listed: boolean): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const family = await getOwnedFamily(supabase, user.id, familyId)
  if (!family) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.from('students').update({ is_listed_in_directory: listed }).eq('id', studentId).eq('family_id', familyId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/account/students')
  revalidatePath('/directory/students')
  return { success: true }
}
