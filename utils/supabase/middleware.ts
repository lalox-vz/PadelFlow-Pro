import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs

    let user = null
    try {
        const userPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<{ data: { user: any }, error: any }>((resolve) =>
            setTimeout(() => resolve({ data: { user: null }, error: "Auth check timed out" }), 2000)
        )

        const { data: { user: fetchedUser }, error } = await Promise.race([userPromise, timeoutPromise])
        if (error) {
            // console.warn("Middleware Auth Warning:", error) // Optional logging
        }
        user = fetchedUser
    } catch (e) {
        // console.error("Middleware Auth Error:", e)
    }

    // PROTECTED ROUTES
    const url = request.nextUrl.clone()
    const protectedPaths = ['/admin', '/client', '/player', '/academy', '/club', '/coach']
    const isProtected = protectedPaths.some(path => url.pathname.startsWith(path))

    if (!user && isProtected) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // God Mode / Super Admin Impersonation Middleware Check
    // If we are a super_admin, we might be impersonating another role.
    if (user?.app_metadata?.role === 'super_admin') {
        const impersonatedRole = request.cookies.get('impersonated_role')?.value
        if (impersonatedRole) {
            // Enforce role-based restrictions for the impersonated role

            // Visitor: Should not access protected routes
            if (impersonatedRole === 'visitor' && isProtected) {
                url.pathname = '/'
                return NextResponse.redirect(url)
            }

            // Client: Should not access admin routes
            if (impersonatedRole === 'client' && url.pathname.startsWith('/admin')) {
                url.pathname = '/player/explore'
                return NextResponse.redirect(url)
            }

            // Academy Owner (admin): Can access admin, so no redirect needed (unless accessing super-admin only pages, preventing that usually handled in UI)
        }
    }

    // AUTH ROUTES (Redirect if already logged in)
    if (user && (url.pathname === '/login' || url.pathname === '/signup')) {
        const role = user.user_metadata?.role?.toLowerCase()
        const metaOrgId = user.user_metadata?.organization_id
        const metaBusinessType = user.user_metadata?.business_type

        if (role === 'academy_owner' || (metaOrgId && metaBusinessType === 'academy')) {
            url.pathname = '/academy/dashboard'
        } else if (role === 'owner' || role === 'club_owner' || (metaOrgId && metaBusinessType === 'club')) {
            url.pathname = '/club/dashboard'
        } else if (role === 'coach') {
            url.pathname = '/coach/schedule'
        } else if (role === 'admin' || role === 'super_admin') {
            url.pathname = '/admin' // Or whatever the admin dashboard is
        } else {
            url.pathname = '/player/explore'
        }

        return NextResponse.redirect(url)
    }

    return response
}
