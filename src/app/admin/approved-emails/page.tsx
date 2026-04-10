import { createClient } from '@/lib/supabase/server'
import { ApprovedEmailsClient } from './ApprovedEmailsClient'

export default async function ApprovedEmailsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('approved_emails')
    .select('id, email, added_at, claimed_at, claimed_by_user:users!claimed_by_user_id(email)')
    .order('added_at', { ascending: false })

  return <ApprovedEmailsClient emails={data ?? []} />
}
