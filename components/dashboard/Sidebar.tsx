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
    Circle,
    Home,
    Landmark,
    ClipboardList,
    ClipboardCheck,
    PieChart,
    ChevronRight,
    TrendingUp,
    LayoutGrid
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { supabase } from "@/lib/supabase"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
    const [isSessionValid, setIsSessionValid] = useState(true)
    const [isHovered, setIsHovered] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    // Sync Hover state with Mobile Open state effectively
    const showLabels = isOpen || isHovered

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (!session || error) {
                console.warn("Zombie Session Detected - Force Logout")
                setIsSessionValid(false)
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

    // --- Links Configuration ---
    const playerLinks = [
        { name: "Explorar", href: "/player/explore", icon: Globe },
        { name: "Mis Reservas", href: "/player/bookings", icon: CalendarDays },
        { name: "Mis Clases", href: "/player/classes", icon: Dumbbell },
        { name: "Notificaciones", href: "/notifications", icon: Bell },
    ];

    // Club Owner - GOD MODE LIST
    const clubLinksStrict = [
        { name: "Inicio", href: "/club/dashboard", icon: LayoutDashboard },
        { name: "Calendario", href: "/club/calendar", icon: CalendarDays },
        { name: "Canchas", href: "/club/courts", icon: LayoutGrid },
        { name: "Socios", href: "/club/fixed-members", icon: Users },
        { name: "Directorio", href: "/club/directory", icon: Users },
        { name: "Equipo", href: "/team", icon: UserCheck },
        { name: "Caja", href: "/club/shift-closure", icon: ClipboardCheck },
        { name: "Finanzas y Reportes", href: "/club/revenue", icon: TrendingUp }, // Merged
        { name: "Configuración", href: "/club/settings", icon: Settings },
    ];

    const staffLinksStrict = [
        { name: "Calendario", href: "/club/calendar", icon: CalendarDays },
        { name: "Canchas", href: "/club/courts", icon: Dumbbell },
        { name: "Socios", href: "/club/fixed-members", icon: UserCheck },
        { name: "Caja", href: "/club/shift-closure", icon: ClipboardCheck },
        { name: "Notificaciones", href: "/notifications", icon: Bell },
    ];

    const academyLinksStrict = [
        { name: "Dashboard", href: "/academy/dashboard", icon: LayoutDashboard },
        { name: "Programas", href: "/academy/programs", icon: Dumbbell },
        { name: "Alumnos", href: "/academy/students", icon: Users },
        { name: "Coaches", href: "/academy/coaches", icon: UserCheck },
        { name: "Horarios", href: "/academy/schedule", icon: CalendarDays },
        { name: "Ajustes", href: "/academy/settings", icon: Settings },
    ];

    const superAdminLinks = [
        { name: "Global", href: "/admin", icon: Globe },
        { name: "Entidades", href: "/admin/entities", icon: Landmark },
        { name: "Usuarios", href: "/admin/users", icon: Users },
        { name: "Soporte", href: "/admin/support", icon: Bell },
    ];

    // Notification Fetching
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
        if (userRole && user) {
            fetchUnread()
            const interval = setInterval(fetchUnread, 30000)
            const handleUpdate = () => fetchUnread()
            window.addEventListener('notificationsUpdated', handleUpdate)
            return () => {
                clearInterval(interval)
                window.removeEventListener('notificationsUpdated', handleUpdate)
            }
        }
    }, [userRole, user])


    // --- Role Logic ---
    const role = userRole as any
    let links = playerLinks
    const hasOrgId = user?.user_metadata?.organization_id || false
    const businessType = user?.user_metadata?.business_type || 'club'

    if (role === 'super_admin') {
        links = superAdminLinks
    } else if (role === 'academy_owner') {
        links = academyLinksStrict
    } else if (role === 'club_owner' || role === 'owner') {
        links = clubLinksStrict
    } else if (role === 'club_staff') {
        links = staffLinksStrict
    }

    // Context Overrides
    if (pathname?.startsWith('/admin') && role === 'super_admin') links = superAdminLinks
    else if ((pathname?.startsWith('/club') || pathname === '/settings') && businessType !== 'academy' && (hasOrgId || role === 'club_owner' || role === 'club_staff')) {
        links = role === 'club_staff' ? staffLinksStrict : clubLinksStrict
    } else if ((pathname?.startsWith('/academy') || pathname === '/settings') && (hasOrgId || role === 'academy_owner')) {
        if (businessType === 'academy') links = academyLinksStrict
    }

    // Security Filter
    if (role === 'club_staff') {
        const sensitiveLinks = ['/team', '/club/revenue', '/club/settings', '/club/audit', '/club/analytics']
        links = links.filter(link => !sensitiveLinks.includes(link.href))
        if (profile?.permissions && Array.isArray(profile.permissions)) {
            const permissionMap: Record<string, string> = {
                '/club/calendar': 'calendar',
                '/club/courts': 'courts',
                '/club/fixed-members': 'fixed_members',
                '/club/shift-closure': 'cash_register',
                '/notifications': 'notifications',
                '/club/dashboard': 'dashboard'
            }
            links = links.filter(link => {
                const requiredPerm = permissionMap[link.href]
                return !requiredPerm || profile.permissions?.includes(requiredPerm)
            })
        }
    }

    const toggleLanguage = () => setLanguage(language === 'es' ? 'en' : 'es')

    // --- RENDER ---
    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => onClose?.()}
            />

            {/* THE ISLAND DOCK */}
            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col bg-zinc-950/90 backdrop-blur-xl border-r border-white/5 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                    // Mobile: Slide in
                    isOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full md:translate-x-0",
                    // Desktop: Dock Logic
                    "md:relative md:h-[calc(100vh-2rem)] md:my-4 md:ml-4 md:rounded-2xl md:border md:shadow-2xl",
                    isHovered ? "md:w-64" : "md:w-20"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Logo Area */}
                <div className="flex items-center justify-between p-4 h-20">
                    <div className={cn("flex items-center gap-3 transition-all duration-300", !showLabels && "justify-center w-full")}>
                        <Link href={getHomeRoute(userRole)} className="relative group">
                            <div className="absolute inset-0 bg-[#ccff00]/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            <OlimpoLogo className={cn("text-[#ccff00] transition-all duration-300", showLabels ? "h-8 w-8" : "h-10 w-10")} />
                        </Link>

                        <div className={cn("flex flex-col overflow-hidden transition-all duration-300", showLabels ? "w-auto opacity-100" : "w-0 opacity-0")}>
                            <span className="font-bold text-white tracking-tight whitespace-nowrap">PadelFlow</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Business</span>
                        </div>
                    </div>
                    {/* Mobile Close */}
                    <button onClick={onClose} className="md:hidden text-zinc-400 hover:text-white">
                        <ChevronRight className="h-6 w-6 rotate-180" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1 scrollbar-hide">
                    {links.map((item) => {
                        const isActive = pathname === item.href
                        const isNotification = item.href?.includes('notifications')

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => onClose?.()}
                                className={cn(
                                    "relative flex items-center px-3 py-3 rounded-xl transition-all duration-200 group overflow-hidden",
                                    isActive
                                        ? "bg-gradient-to-r from-[#ccff00]/20 to-transparent text-white shadow-[inset_2px_0_0_0_#ccff00]"
                                        : "text-zinc-400 hover:text-white hover:bg-white/5",
                                    !showLabels && "justify-center"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "flex-shrink-0 transition-colors duration-200",
                                        isActive ? "text-[#ccff00]" : "text-zinc-400 group-hover:text-white",
                                        showLabels ? "h-5 w-5 mr-3" : "h-6 w-6"
                                    )}
                                    strokeWidth={isActive ? 2.5 : 2}
                                />

                                <span className={cn("font-medium whitespace-nowrap transition-all duration-300", showLabels ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute")}>
                                    {item.name}
                                </span>

                                {isNotification && unreadCount > 0 && (
                                    <span className={cn(
                                        "absolute top-3 bg-red-500 rounded-full ring-4 ring-zinc-950 flex items-center justify-center font-bold text-[9px] text-white",
                                        showLabels ? "right-3 h-5 w-5" : "right-1.5 top-1.5 h-2.5 w-2.5"
                                    )}>
                                        {showLabels && (unreadCount > 9 ? '9+' : unreadCount)}
                                    </span>
                                )}

                                {isActive && showLabels && (
                                    <ChevronRight className="ml-auto h-4 w-4 text-[#ccff00]/50" />
                                )}
                            </Link>
                        )
                    })}
                </div>

                {/* Footer User Profile */}
                <div className={cn(
                    "p-4 border-t border-white/5 bg-black/20 backdrop-blur-md transition-all duration-300",
                    !showLabels && "items-center flex flex-col justify-center"
                )}>
                    {userName ? (
                        <div className={cn("flex items-center gap-3", !showLabels && "justify-center")}>
                            <Avatar className="h-9 w-9 border border-white/10 ring-2 ring-black">
                                <AvatarFallback className="bg-[#ccff00] text-black font-bold text-xs">
                                    {userName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <div className={cn("flex flex-col overflow-hidden transition-all duration-300", showLabels ? "w-auto opacity-100" : "w-0 opacity-0 hidden")}>
                                <span className="text-sm font-medium text-white truncate max-w-[140px]">{userName}</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] text-zinc-400">Online</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={cn("h-9 w-9 rounded-full bg-zinc-800 animate-pulse", !showLabels && "mx-auto")} />
                    )}

                    {showLabels && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button onClick={toggleLanguage} className="flex items-center justify-center h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors">
                                <Globe className="h-3 w-3 mr-1.5" /> {language.toUpperCase()}
                            </button>
                            <button onClick={() => signOut()} className="flex items-center justify-center h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-red-400 hover:bg-red-950/30 hover:border-red-900 transition-colors">
                                <LogOut className="h-3 w-3 mr-1.5" /> Salir
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
