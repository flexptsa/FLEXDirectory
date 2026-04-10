import { createClient } from '@/lib/supabase/server'
import { AppNavClient } from './AppNavClient'

export async function AppNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: string | null = null
  if (user) {
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    role = data?.role ?? null
  }

  const isAdmin = role === 'moderator' || role === 'super_admin'
  const email = user?.email ?? null

  return <AppNavClient isAdmin={isAdmin} email={email} />
}
