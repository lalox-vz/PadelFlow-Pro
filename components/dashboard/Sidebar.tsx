"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { getDashboardRoute, getHomeRoute } from "@/lib/role-navigation"
import {
    LayoutDashboard,
    CalendarDays,
    Users,
    Settings,
    LogOut,
    Dumbbell,
    Bell,
    Globe,
    BarChart3,
    UserCheck,
    CreditCard,
    Circle, // Added Circle icon
    Home, // Added Home icon
    Landmark, // For Club
    ClipboardList, // For Academy
    User, // Added User icon
    ClipboardCheck, // For Shift Closure
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { supabase } from "@/lib/supabase" // Direct import needed for check
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"

// ...

interface SidebarProps {
    userRole: 'admin' | 'client' | 'super_admin' | 'owner' | 'coach' | 'student'
    userName?: string | null
    isOpen?: boolean
    onClose?: () => void
    membershipTier?: 'VIP' | 'Access' | 'Basic' | 'Not a Member' | null
}

export function Sidebar({ userRole, userName, isOpen, onClose, membershipTier }: SidebarProps) {
    const pathname = usePathname()
    const { user, profile, signOut } = useAuth()
    const { t, language, setLanguage } = useLanguage()
    const [isSessionValid, setIsSessionValid] = useState(true) // Default to true to prevent initial red flash

    // Zombie Session Killer: Check session on every navigation
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()

            if (!session || error) {
                console.warn("Zombie Session Detected - Force Logout")
                setIsSessionValid(false)

                // Force cleanup if we are supposed to be inside the dashboard
                // Only redirect if we are NOT already on public pages (like login)
                // But sidebar implies we are authenticated.
                if (typeof window !== 'undefined') {
                    localStorage.clear()
                    sessionStorage.clear()
                    window.location.href = '/login'
                }
            } else {
                setIsSessionValid(true)
            }
        }

        checkSession()
    }, [pathname])


    // --- Navigation Definitions ---
    // 1. Player (Client)
    const playerLinks = [
        { name: "Explorar", href: "/player/explore", icon: Globe },
        { name: "Mis Reservas", href: "/player/bookings", icon: CalendarDays },
        { name: "Mis Clases", href: "/player/classes", icon: Dumbbell },
        { name: "Notificaciones", href: "/notifications", icon: Bell },
    ];

    // 2. Club Owner
    const clubLinks = [
        { name: "Panel del Club", href: "/club/dashboard", icon: LayoutDashboard },
        { name: "Gestión de Canchas", href: "/club/courts", icon: LayoutDashboard },
        { name: "Calendario Global", href: "/club/calendar", icon: CalendarDays },
        { name: "Socios Fijos", href: "/club/fixed-members", icon: Users }, // Keeping useful links even if not top 3 in Brief, or should I limit? Brief says "Sidebar: 1st, 2nd, 3rd Item". I will keep core ones but prioritize these.
        // Brief Map Listing:
        // 1. Panel del Club
        // 2. Gestión de Canchas
        // 3. Calendario Global
        // I will stick to these 3 plus essential Settings/Revenue if needed, but maybe hidden? 
        // "Legacy Link Purge... Remove... Entrenamientos, Planes... Replace with specific PadelFlow links". 
        // I will keep the list I had but rename/order to match brief.
    ];
    // Re-defining Club Links strictly as per Brief + Essentials
    const clubLinksStrict = [
        { name: "Panel del Club", href: "/club/dashboard", icon: LayoutDashboard },
        { name: "Gestión de Canchas", href: "/club/courts", icon: Dumbbell }, // Icon reuse
        { name: "Calendario Global", href: "/club/calendar", icon: CalendarDays },
        { name: "Socios Fijos", href: "/club/fixed-members", icon: UserCheck },
        { name: "Mi Equipo", href: "/team", icon: Users },
        { name: "Cierre de Turno", href: "/club/shift-closure", icon: ClipboardCheck },
        { name: "Notificaciones", href: "/notifications", icon: Bell },
        { name: "Ingresos", href: "/club/revenue", icon: CreditCard },
        { name: "Análisis de Canchas", href: "/club/analytics", icon: BarChart3 },
        { name: "Auditoría", href: "/club/audit", icon: ClipboardList },
        { name: "Ajustes del Club", href: "/club/settings", icon: Settings },
    ];

    const staffLinksStrict = [
        { name: "Calendario Global", href: "/club/calendar", icon: CalendarDays },
        { name: "Gestión de Canchas", href: "/club/courts", icon: Dumbbell },
        { name: "Socios Fijos", href: "/club/fixed-members", icon: UserCheck },
        { name: "Cierre de Turno", href: "/club/shift-closure", icon: ClipboardCheck },
        { name: "Notificaciones", href: "/notifications", icon: Bell },
    ];

    // 3. Academy Owner
    const academyLinksStrict = [
        { name: "Panel de Academia", href: "/academy/dashboard", icon: LayoutDashboard },
        { name: "Programas", href: "/academy/programs", icon: Dumbbell },
        { name: "Gestión de Alumnos", href: "/academy/students", icon: Users },
        { name: "Coaches", href: "/academy/coaches", icon: UserCheck },
        { name: "Horarios", href: "/academy/schedule", icon: CalendarDays },
        { name: "Notificaciones", href: "/notifications", icon: Bell },
        { name: "Ajustes de Academia", href: "/academy/settings", icon: Settings }, // Added Settings link for Academy
    ];

    // 4. Super Admin
    const superAdminLinks = [
        { name: "Global Dashboard", href: "/admin", icon: Globe },
        { name: "Entidades", href: "/admin/entities", icon: Landmark },
        { name: "Usuarios", href: "/admin/users", icon: Users },
        { name: "Pagos", href: "/admin/payments", icon: CreditCard },
        { name: "Notificaciones", href: "/notifications", icon: Bell },
        { name: "Soporte", href: "/admin/support", icon: Bell },
    ];

    const [unreadCount, setUnreadCount] = useState(0)

    const fetchUnread = async () => {
        if (!user) return

        const { supabase } = await import("@/lib/supabase")
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false)

        setUnreadCount(count || 0)
    }

    useEffect(() => {
        // Fetch for both admin and client (if user is logged in)
        if (userRole && user) {
            fetchUnread()
            const interval = setInterval(fetchUnread, 30000) // Poll every 30s
            // Listen for manual updates
            const handleUpdate = () => fetchUnread()
            window.addEventListener('notificationsUpdated', handleUpdate)

            return () => {
                clearInterval(interval)
                window.removeEventListener('notificationsUpdated', handleUpdate)
            }
        }
    }, [userRole, user])

    // --- REFACTOR: IDENTIDAD POR ID (Seguridad) ---
    // Determinamos el set de links basándonos PRIMERO en la existencia de un negocio (organization_id)
    // Esto es más robusto que confiar solo en el string de role.

    const role = userRole as any
    let links = playerLinks

    // 1. Extraer metadatos de negocio de user_metadata (fuente rápida) o profile (fuente db)
    const hasOrgId = user?.user_metadata?.organization_id || false
    const businessType = user?.user_metadata?.business_type || 'club' // Default safe

    // 2. Lógica de Selección de Links
    if (role === 'super_admin') {
        links = superAdminLinks
    }
    // Si tiene organization_id, es un dueño/admin. Determinamos qué mostrar por el tipo.
    else if (hasOrgId) {
        if (businessType === 'academy') {
            links = academyLinksStrict
        } else {
            // Asumimos 'club' para cualquier otro caso, o explícitamente 'club'
            if (role === 'club_staff') {
                links = staffLinksStrict
            } else {
                links = clubLinksStrict
            }
        }
    }
    // Si no tiene ID, miramos el rol por si acaso (backward compatibility o coaches sin org propia)
    else if (role === 'academy_owner') {
        links = academyLinksStrict
    } else if (role === 'owner' || role === 'club_owner') {
        links = clubLinksStrict
    } else if (role === 'coach') {
        links = playerLinks // TODO: Coach Links
    } else {
        // Fallback final: Jugador
        links = playerLinks
    }

    // 3. Override Contextual (Solo si estamos navegando explícitamente en otra área permitida)
    // Esto permite a un dueño ver "mis reservas" si navega a /player/* explícitamente, pero por defecto ve su dashboard
    if (pathname?.startsWith('/admin') && role === 'super_admin') {
        links = superAdminLinks
    } else if ((pathname?.startsWith('/club') || pathname === '/settings') && (hasOrgId || role === 'club_owner' || role === 'club_staff')) {
        // Fix Persistencia: Si voy a /settings y soy club owner, mantengo menu club
        if (businessType !== 'academy') {
            if (role === 'club_staff') {
                links = staffLinksStrict
            } else {
                links = clubLinksStrict
            }
        }
    } else if ((pathname?.startsWith('/academy') || pathname === '/settings') && (hasOrgId || role === 'academy_owner')) {
        // Fix Persistencia: Si voy a /settings y soy academy owner, mantengo menu academy
        if (businessType === 'academy') links = academyLinksStrict
    } else if (pathname?.startsWith('/player')) {
        // Si un dueño va explícitamente al área de jugador, NO sobreescribimos links
    }

    // 4. GLOBAL SECURITY BLANKET (Apply to ALL routes, including /notifications)
    // This ensures Staff never sees admin links even if they wander to a generic page
    if (role === 'club_staff') {
        const sensitiveLinks = ['/team', '/club/revenue', '/club/settings', '/club/audit', '/club/analytics']
        links = links.filter(link => !sensitiveLinks.includes(link.href))

        // MODULAR PERMISSIONS FILTER
        // Permission Map: Path -> Permission Key
        const permissionMap: Record<string, string> = {
            '/club/calendar': 'calendar',
            '/club/courts': 'courts',
            '/club/fixed-members': 'fixed_members',
            '/club/shift-closure': 'cash_register',
            '/notifications': 'notifications',
            '/club/analytics': 'analytics',
            '/club/dashboard': 'dashboard'
        }

        // If user has permissions array, filter. If not, default to ALL or NONE? 
        // Strategy: If permissions is null/undefined (legacy staff), show ALL allowed links (backward compatibility). 
        // If it is an array (even empty), filter strictly.
        if (profile?.permissions && Array.isArray(profile.permissions)) {
            links = links.filter(link => {
                const requiredPerm = permissionMap[link.href]
                if (!requiredPerm) return true // No specific permission needed (e.g. Dashboard)
                return profile.permissions?.includes(requiredPerm)
            })
        }
    }

    const toggleLanguage = () => {
        setLanguage(language === 'es' ? 'en' : 'es')
    }

    const getMembershipIcon = () => {
        if (!membershipTier || membershipTier === 'Not a Member') return null
        if (membershipTier === 'VIP') return <span className="ml-2 text-yellow-400 font-bold" title="VIP Member">VIP ★</span>
        if (membershipTier === 'Access') return <span className="ml-2 text-blue-400 font-bold" title="Access Member">✓</span>
        if (membershipTier === 'Basic') return <span className="ml-2 text-gray-400 font-bold" title="Basic Member">✓</span>
        return null
    }

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-20 bg-gray-600 bg-opacity-75 transition-opacity md:hidden",
                    isOpen ? "opacity-100 ease-out duration-300" : "opacity-0 pointer-events-none ease-in duration-200"
                )}
                onClick={() => onClose?.()}
            />

            {/* Sidebar Component */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-30 w-64 transform bg-gray-900 transition duration-300 ease-in-out md:static md:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full bg-gray-900">
                    <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                        <div className="flex items-center flex-shrink-0 px-4 justify-between">
                            <div className="flex items-center gap-4">
                                <Link
                                    href={getHomeRoute(user?.user_metadata?.role || userRole)}
                                    className="flex items-center group"
                                    title="Ir al Panel Principal"
                                >
                                    <OlimpoLogo className="h-9 w-auto text-white group-hover:text-white/80 transition-colors" />
                                </Link>
                                <Link
                                    href={getHomeRoute(user?.user_metadata?.role || userRole)}
                                    className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                    title="Ir al Panel Principal"
                                >
                                    <Home className="h-5 w-5" />
                                </Link>
                            </div>
                            <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
                                <span className="sr-only">Close sidebar</span>
                                {/* Simple X icon SVG */}
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <nav className="mt-8 flex-1 px-2 space-y-1">
                            {links.map((item, index) => {
                                const isActive = pathname === item.href
                                const isNotification = item.href?.includes('notifications')
                                const isPriority = index < 3

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            isActive ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white",
                                            "group flex items-center px-2 py-2 text-sm font-medium rounded-md relative",
                                            isPriority && "font-semibold",
                                            isActive && "border-r-4 border-indigo-500"
                                        )}
                                        onClick={() => onClose?.()}
                                    >
                                        <item.icon
                                            className={cn(
                                                isActive ? "text-gray-300" : "text-gray-400 group-hover:text-gray-300",
                                                "mr-3 flex-shrink-0 h-6 w-6"
                                            )}
                                            aria-hidden="true"
                                            strokeWidth={isPriority ? 2.5 : 2}
                                        />
                                        {item.name}
                                        {isNotification && unreadCount > 0 && (
                                            <span className="absolute right-2 top-2 block h-2.5 w-2.5 rounded-full ring-2 ring-gray-900 bg-red-500" />
                                        )}
                                    </Link>
                                )
                            })}
                        </nav>
                    </div>
                    <div className="flex-shrink-0 flex bg-gray-800 p-4 flex-col gap-2">
                        {/* Language Toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center px-2 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md w-full"
                        >
                            <Globe className="mr-3 h-6 w-6 text-gray-400" />
                            <span>{language === 'es' ? 'English' : 'Español'}</span>
                        </button>

                        {userName && (
                            <div className="text-sm text-gray-400 px-2 pb-2 border-b border-gray-700 mt-2 flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-white font-medium">{userName}</span>
                                    {getMembershipIcon()}
                                </div>
                                <div className="flex items-center gap-1" title={isSessionValid ? "Online" : "Connection Lost"}>
                                    <Circle className={`h-2 w-2 fill-current ${isSessionValid ? 'text-green-500' : 'text-red-500 animate-pulse'}`} />
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => signOut()}
                            className="flex-shrink-0 w-full group block mt-2"
                        >
                            <div className="flex items-center">
                                <LogOut className="inline-block h-5 w-5 text-gray-400 group-hover:text-gray-300" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-300 group-hover:text-white">{t.dashboard.sidebar.signout}</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
