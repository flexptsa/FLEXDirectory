'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function addApprovedEmails(emails: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const deduped = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))]
  if (deduped.length === 0) return

  await supabase.from('approved_emails').upsert(
    deduped.map((email) => ({ email, added_by: user.id })),
    { onConflict: 'email', ignoreDuplicates: true }
  )

  revalidatePath('/admin/approved-emails')
}

export async function deleteApprovedEmail(id: string) {
  const supabase = await createClient()
  await supabase.from('approved_emails').delete().eq('id', id).is('claimed_at', null)
  revalidatePath('/admin/approved-emails')
}

export async function resetApprovedEmail(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'moderator' && profile?.role !== 'super_admin') throw new Error('Forbidden')

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  await adminClient
    .from('approved_emails')
    .update({ claimed_at: null, claimed_by_user_id: null })
    .eq('id', id)

  revalidatePath('/admin/approved-emails')
}
