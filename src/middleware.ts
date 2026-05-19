import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
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
  const path = request.nextUrl.pathname
  const isPortalPath = path.startsWith('/portal')
  const isPortalLogin = path === '/portal/login'
  const isStaffLogin = path === '/login'
  const isKlant = user?.user_metadata?.role === 'klant'

  if (!user) {
    if (isPortalPath && !isPortalLogin) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    if (!isPortalPath && !isStaffLogin) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Authenticated klant on portal login → go to dashboard
  if (isKlant && isPortalLogin) {
    return NextResponse.redirect(new URL('/portal/dashboard', request.url))
  }

  // Authenticated klant trying to access staff app → redirect to portal
  if (isKlant && !isPortalPath) {
    return NextResponse.redirect(new URL('/portal/dashboard', request.url))
  }

  // Authenticated staff trying to access portal → redirect to staff app
  if (!isKlant && isPortalPath) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Authenticated staff on staff login → go to app root
  if (!isKlant && isStaffLogin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
