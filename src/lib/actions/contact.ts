'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from '@/types'

export async function sendContactMessage(
  recipientFamilyId: string,
  messageBody: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('is_approved')
    .eq('id', user.id)
    .single()
  if (!profile?.is_approved) return { success: false, error: 'Access not approved' }

  if (!messageBody.trim()) return { success: false, error: 'Message cannot be empty.' }
  if (messageBody.length > 1000) return { success: false, error: 'Message too long.' }

  // Verify recipient family exists and is active
  const { data: family } = await supabase
    .from('families')
    .select('id, public_email, show_email, family_display_name')
    .eq('id', recipientFamilyId)
    .is('deleted_at', null)
    .single()

  if (!family) return { success: false, error: 'Family not found.' }

  // Insert message row
  const { error } = await supabase.from('contact_messages').insert({
    sender_user_id: user.id,
    recipient_family_id: recipientFamilyId,
    message_body: messageBody,
  })

  if (error) return { success: false, error: error.message }

  // Fire-and-forget: call the Edge Function to send notification email
  // We don't await this — message is saved regardless of email delivery
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (supabaseUrl && serviceKey && family.public_email && family.show_email) {
    fetch(`${supabaseUrl}/functions/v1/send-contact-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        recipientEmail: family.public_email,
        recipientFamilyName: family.family_display_name,
        messageBody,
      }),
    }).catch(() => {
      // Email failure is non-fatal — message is already saved
    })
  }

  return { success: true }
}
