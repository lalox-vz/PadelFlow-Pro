"use client"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase" // Use the singleton!
import { User, Session } from "@supabase/supabase-js"
import { UserProfile } from "@/types"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"

type AuthContextType = {
    user: User | null
    profile: UserProfile | null
    session: Session | null
    loading: boolean
    userRole: string | null // Exposed role for easy access
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    userRole: null,
    signOut: async () => { },
})

// LocalStorage keys for caching
const ROLE_CACHE_KEY = 'padelflow_user_role'
const PROFILE_CACHE_KEY = 'padelflow_user_profile'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // const supabase = createClient() <-- REMOVED: Do not create a separate instance
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [userRole, setUserRole] = useState<string | null>(null)
    const { t } = useLanguage()
    const { toast } = useToast()
    const isManualSignOut = useRef(false)

    // Load cached role and profile on mount (INSTANT RESTORE)
    useEffect(() => {
        if (typeof window === 'undefined') return

        const cachedRole = localStorage.getItem(ROLE_CACHE_KEY)
        const cachedProfile = localStorage.getItem(PROFILE_CACHE_KEY)

        if (cachedRole) {
            setUserRole(cachedRole)
            console.log("AUTH: Restored role from cache:", cachedRole)
        }

        if (cachedProfile) {
            try {
                const parsedProfile = JSON.parse(cachedProfile)
                setProfile(parsedProfile)
                console.log("AUTH: Restored profile from cache")
            } catch (e) {
                console.error("AUTH: Failed to parse cached profile", e)
            }
        }
    }, [])

    const fetchProfile = async (currentUser: User) => {
        try {
            const { data, error } = await supabase.from('users').select('*').eq('id', currentUser.id).maybeSingle()
            if (error) throw error

            if (!data) {
                console.warn("AUTH: User logged in but no profile found in public.users")
                setProfile(null)
                // We might want to trigger a sync or create a default profile here
                return
            }

            // God Mode / Impersonation Logic
            let finalProfile = data
            let finalRole = data?.role || 'client'

            if (currentUser.app_metadata?.role === 'super_admin') {
                const isClient = typeof document !== 'undefined'
                if (isClient) {
                    const cookies = document.cookie.split('; ')
                    const roleCookie = cookies.find(row => row.startsWith('impersonated_role='))
                    const impersonatedRole = roleCookie ? roleCookie.split('=')[1] : null

                    if (impersonatedRole) {
                        console.log("God Mode: Impersonating", impersonatedRole)
                        finalProfile = { ...data, role: impersonatedRole }
                        finalRole = impersonatedRole
                    } else {
                        // Default to super_admin if no impersonation
                        finalProfile = { ...data, role: 'super_admin' }
                        finalRole = 'super_admin'
                    }
                } else {
                    // Server-side (during initial SSR sometimes), default to super_admin logic if needed
                    // But AuthContext is client-only.
                    finalProfile = { ...data, role: 'super_admin' }
                    finalRole = 'super_admin'
                }
            }

            // CRITICAL FIX: Removed automatic promotion/downgrade logic.
            // We now trust the database role 100%.

            setProfile(finalProfile)
            setUserRole(finalRole)

            // Cache role and profile in localStorage for persistence
            if (typeof window !== 'undefined') {
                const cachedRole = localStorage.getItem(ROLE_CACHE_KEY)

                // If role changed (e.g. upgraded from 'player' to 'club_staff'), 
                // we overwrite the cache to ensure instant reflection on next reload.
                if (cachedRole && cachedRole !== finalRole) {
                    console.warn(`AUTH: Role mismatch detected (Cached: ${cachedRole} vs DB: ${finalRole}). Updating cache.`)
                    localStorage.setItem(ROLE_CACHE_KEY, finalRole)
                    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(finalProfile))
                } else {
                    localStorage.setItem(ROLE_CACHE_KEY, finalRole)
                    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(finalProfile))
                }

                console.log("AUTH: Cached role and profile:", finalRole)
            }
        } catch (error: any) {
            console.error("Error fetching profile details:", error.message || error)
            setProfile(null)
            setUserRole(null)

            // Clear cache on error
            if (typeof window !== 'undefined') {
                localStorage.removeItem(ROLE_CACHE_KEY)
                localStorage.removeItem(PROFILE_CACHE_KEY)
            }
        }
    }

    useEffect(() => {
        let mounted = true

        // Safety Timeout: Force loading to false after 7 seconds to prevent "White Screen of Death"
        const safetyTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn("AUTH: Safety timeout triggered. Forcing loading to false.")
                setLoading(false)
            }
        }, 7000)

        const initializeAuth = async () => {
            console.log("AUTH: Initializing...")
            try {
                // Check active session with a timeout
                // We race against a 5s timeout for the session check itself
                const sessionPromise = supabase.auth.getSession()
                const timeoutPromise = new Promise<{ data: { session: Session | null }, error: any }>((resolve) =>
                    setTimeout(() => resolve({ data: { session: null }, error: "Session check timed out" }), 5000)
                )

                const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise])

                if (error) console.error("AUTH: Session check error/timeout:", error)

                if (mounted) {
                    // If we found a session, set it immediately
                    if (session) {
                        setSession(session)
                        setUser(session.user)
                        // Fetch profile without blocking the whole UI forever
                        fetchProfile(session.user)
                    }
                }
            } catch (err) {
                console.error("AUTH: Critical initialization error:", err)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        initializeAuth()

        // Global Loading Guard & Listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return
                console.log("AUTH: State Change Event:", event)

                // Debounce/Check if session is effectively the same? 
                // Currently we just update state, which is fine, but we ensure loading is cleared.

                setSession(session)
                setUser(session?.user ?? null)

                if (event === 'SIGNED_OUT' || !session) {
                    setProfile(null)
                    if (event === 'SIGNED_OUT' && !isManualSignOut.current) {
                        // Optional: Show toast
                    }
                    isManualSignOut.current = false
                } else if (session?.user) {
                    fetchProfile(session.user).catch(err => console.error("Background profile fetch failed", err))
                }

                setLoading(false)
            }
        )

        return () => {
            mounted = false
            clearTimeout(safetyTimeout)
            subscription.unsubscribe()
        }
    }, [t, toast])

    const signOut = async () => {
        isManualSignOut.current = true
        try {
            // Remove impersonation cookie on sign out
            if (typeof document !== 'undefined') {
                document.cookie = "impersonated_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
            }

            // Race signOut with a timeout of 2 seconds so it doesn't hang the UI
            await Promise.race([
                supabase.auth.signOut(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('SignOut Timeout')), 2000))
            ])
        } catch (error) {
            console.error("Sign out error", error)
        } finally {
            setProfile(null)
            setUser(null)
            setSession(null)
            setUserRole(null)
            setLoading(false)
            if (typeof window !== 'undefined') {
                localStorage.clear()
                sessionStorage.clear()
                window.location.href = '/login'
            }
        }
    }

    return (
        <AuthContext.Provider value={{ user, profile, session, loading, userRole, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
