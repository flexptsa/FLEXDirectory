import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth`)
  }

  const email = user.email?.toLowerCase() ?? ''

  // Check if this email was invited as a parent or student
  const [parentMatch, studentMatch] = await Promise.all([
    email
      ? supabase
          .from('parents')
          .select('id')
          .eq('invite_email', email)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    email
      ? supabase
          .from('students')
          .select('id')
          .eq('invite_email', email)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const isInvited = !!(parentMatch.data || studentMatch.data)

  if (isInvited) {
    // Approve this user automatically as a 'member'
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await adminClient
      .from('users')
      .update({ role: 'member', is_approved: true })
      .eq('id', user.id)

    return NextResponse.redirect(`${origin}/directory`)
  }

  // Check if user is already approved in the users table
  const { data: dbUser } = await supabase
    .from('users')
    .select('is_approved')
    .eq('id', user.id)
    .single()

  if (!dbUser?.is_approved) {
    // Upsert an access request so admins can review
    await supabase.from('access_requests').upsert(
      { user_id: user.id },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
    return NextResponse.redirect(`${origin}/auth/waiting`)
  }

  return NextResponse.redirect(`${origin}/directory`)
}
