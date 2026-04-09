import Link from 'next/link'
import { LogOut, Settings, Shield, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

async function signOut() {
  'use server'
  const { createClient: create } = await import('@/lib/supabase/server')
  const supabase = await create()
  await supabase.auth.signOut()
  const { redirect } = await import('next/navigation')
  redirect('/')
}

export async function NavBar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: string | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    role = data?.role ?? null
  }

  const isAdmin = role === 'moderator' || role === 'super_admin'

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/directory" className="flex items-center gap-2 font-semibold text-primary">
          <Users className="h-5 w-5" />
          FLEX Directory
        </Link>

        {user && (
          <nav className="flex items-center gap-1">
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin" className="gap-1">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link href="/account/students" className="gap-1">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">My profile</span>
              </Link>
            </Button>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit" className="gap-1">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </nav>
        )}
      </div>
    </header>
  )
}
