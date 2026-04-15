import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getOnboardingState } from '@/lib/onboarding'

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
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
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

  // Ensure user exists in public.users (in case the DB trigger didn't fire)
  await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    role: 'pending',
    is_approved: false,
  }, { onConflict: 'id', ignoreDuplicates: true })

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

  // Service role client — used for approved_emails (RLS blocks anon) and invite approval
  const serviceClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (isInvited) {
    // Approve this user automatically as a 'member'
    await serviceClient
      .from('users')
      .update({ role: 'member', is_approved: true })
      .eq('id', user.id)

    return NextResponse.redirect(`${origin}/directory`)
  }

  // Check if email is on the pre-approved list (use service role — RLS blocks anon)
  console.log('[callback] checking approved_emails for:', email)
  const { data: approvedEmail, error: approvedEmailError } = await serviceClient
    .from('approved_emails')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  console.log('[callback] approved_emails result:', approvedEmail, 'error:', approvedEmailError)

  if (approvedEmail) {
    await Promise.all([
      serviceClient.from('users').update({ is_approved: true, role: 'parent' }).eq('id', user.id),
      serviceClient.from('approved_emails').update({
        claimed_at: new Date().toISOString(),
        claimed_by_user_id: user.id,
      }).eq('id', approvedEmail.id),
    ])
    const onboardingState = await getOnboardingState(serviceClient, user.id, {
      is_approved: true,
      role: 'parent',
    })
    return NextResponse.redirect(`${origin}${onboardingState.isComplete ? '/directory' : '/onboarding'}`)
  }

  // Check if user is already approved in the users table
  const { data: dbUser } = await supabase
    .from('users')
    .select('is_approved, role')
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

  const onboardingState = await getOnboardingState(supabase, user.id, dbUser)
  return NextResponse.redirect(`${origin}${onboardingState.requiresOnboarding && !onboardingState.isComplete ? '/onboarding' : '/directory'}`)
}
