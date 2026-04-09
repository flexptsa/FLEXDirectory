import { createClient } from '@/lib/supabase/server'
import { AppNavClient } from './AppNavClient'

async function signOut() {
  'use server'
  const { createClient: create } = await import('@/lib/supabase/server')
  const supabase = await create()
  await supabase.auth.signOut()
  const { redirect } = await import('next/navigation')
  redirect('/')
}

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

  return <AppNavClient isAdmin={isAdmin} email={email} signOut={signOut} />
}
