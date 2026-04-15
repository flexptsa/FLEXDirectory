import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getOnboardingState } from '@/lib/onboarding'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthRoute = url.pathname.startsWith('/auth')
  const isPublicRoute = url.pathname === '/'
  const isOnboardingRoute = url.pathname.startsWith('/onboarding')
  const isProtectedRoute = !isAuthRoute && !isPublicRoute

  if (!user && isProtectedRoute) {
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('is_approved, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_approved) {
      const onboardingState = await getOnboardingState(supabase, user.id, profile)

      if (
        onboardingState.requiresOnboarding &&
        !onboardingState.isComplete &&
        !isOnboardingRoute &&
        !isAuthRoute
      ) {
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }

      if (
        isOnboardingRoute &&
        onboardingState.isComplete &&
        url.searchParams.get('success') !== '1' &&
        url.searchParams.get('step') !== 'student'
      ) {
        url.pathname = '/directory'
        url.search = ''
        return NextResponse.redirect(url)
      }

      if (
        isAuthRoute &&
        !url.pathname.startsWith('/auth/callback') &&
        !url.pathname.startsWith('/auth/waiting') &&
        !url.pathname.startsWith('/auth/signout')
      ) {
        url.pathname = onboardingState.requiresOnboarding && !onboardingState.isComplete
          ? '/onboarding'
          : '/directory'
        return NextResponse.redirect(url)
      }
    }
  }

  if (user && isAuthRoute &&
    !url.pathname.startsWith('/auth/callback') &&
    !url.pathname.startsWith('/auth/waiting') &&
    !url.pathname.startsWith('/auth/signout')) {
    url.pathname = '/directory'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
