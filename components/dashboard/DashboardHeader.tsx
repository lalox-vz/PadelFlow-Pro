"use client"

import { Bell, Menu, User, LogOut, Settings, Calendar, CreditCard, ChevronDown, CheckCircle, Dumbbell } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

// Custom Padel Racket Icon
const PadelRacketIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M6 12c0-3.3 2.7-6 6-6s6 2.7 6 6c0 2.1-1.1 4-2.8 5.1L14 21h-4l-1.2-3.9C7.1 16 6 14.1 6 12z" />
        <circle cx="12" cy="12" r="2" />
        <line x1="12" y1="14" x2="12" y2="12" />
    </svg>
)

interface DashboardHeaderProps {
    onMenuClick: () => void
    title?: string
}

export function DashboardHeader({ onMenuClick, title }: DashboardHeaderProps) {
    const { user, profile, userRole: cachedUserRole, signOut } = useAuth()
    const pathname = usePathname()
    const [unreadCount, setUnreadCount] = useState(0)
    const [businessEmail, setBusinessEmail] = useState<string | null>(null)

    // Role Resolution - Use cached userRole first for instant display (localStorage-backed)
    const isSuperAdmin = user?.app_metadata?.role === 'super_admin'
    const dbRole = profile?.role
    const metaRole = user?.user_metadata?.role
    const userRole = cachedUserRole || (isSuperAdmin ? 'super_admin' : (dbRole || metaRole || 'client'))

    const isAdminView = ['admin', 'owner', 'super_admin', 'academy_owner', 'club_owner'].includes(userRole)

    useEffect(() => {
        if (isAdminView && user?.id) {
            const fetchEntityEmail = async () => {
                const { data } = await supabase
                    .from('entities')
                    .select('business_email')
                    .eq('owner_id', user.id)
                    .single()

                if (data?.business_email) {
                    setBusinessEmail(data.business_email)
                }
            }
            fetchEntityEmail()
        } else {
            setBusinessEmail(null)
        }
    }, [isAdminView, user])


    // Unified notification link for all users
    const notificationLink = '/notifications'

    // Name Logic
    const fullName = user?.user_metadata?.full_name || 'Usuario'
    const firstName = fullName.split(' ')[0]

    useEffect(() => {
        if (user) {
            fetchUnread()
            const interval = setInterval(fetchUnread, 30000)
            const handleUpdate = () => fetchUnread()
            window.addEventListener('notificationsUpdated', handleUpdate)
            return () => {
                clearInterval(interval)
                window.removeEventListener('notificationsUpdated', handleUpdate)
            }
        }
    }, [user])

    const fetchUnread = async () => {
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user?.id)
            .eq('read', false)

        setUnreadCount(count || 0)
    }

    const getRoleBadge = () => {
        // Force workspace identity if in specific route
        if (pathname?.startsWith('/club')) return 'Dueño de Club'
        if (pathname?.startsWith('/academy')) return 'Director de Academia'

        switch (userRole) {
            case 'super_admin': return 'Super Admin ⚡'
            case 'owner': return 'Dueño de Club'
            case 'academy_owner': return 'Director de Academia'
            case 'admin': return 'Administrador'
            case 'coach': return 'Coach'
            default: return 'Jugador'
        }
    }

    // Role-based Links
    const getCalendarLink = () => {
        if (userRole === 'owner') return '/club/calendar'
        if (userRole === 'academy_owner') return '/academy/schedule'
        return '/player/bookings'
    }

    const getProfileLink = () => {
        // If owner is in admin context, "Profile" goes to their dashboard or settings
        if (isAdminView) {
            if (userRole === 'owner') return '/club/settings'
            if (userRole === 'academy_owner') return '/academy/dashboard'
        }
        // Default to personal profile
        return '/settings'
    }

    return (
        <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20 w-full transition-all duration-300 border-b border-border sticky top-0">
            <div className="flex h-16 items-center px-4 justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="text-muted-foreground hover:text-foreground focus:outline-none md:hidden transition-colors"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="hidden md:flex flex-col">
                        <h1 className="text-lg font-bold tracking-tight text-foreground">
                            {title || (() => {
                                if (pathname?.startsWith('/club')) return 'Panel del Club'
                                if (pathname?.startsWith('/academy')) return 'Panel de Academia'
                                return isAdminView ? 'Panel de Gestión' : 'Panel de Jugador'
                            })()}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Public Portal Link - Safe Exit */}
                    <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-muted-foreground hover:text-foreground">
                        <Link href="/player/explore">
                            Explorar / Reservar
                        </Link>
                    </Button>

                    {/* Notification Bell */}
                    <Link href={notificationLink} className="relative p-2 text-muted-foreground hover:text-[#ccff00] transition-colors rounded-full hover:bg-zinc-800/50">
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#ccff00] shadow-sm ring-1 ring-background animate-pulse">
                            </span>
                        )}
                    </Link>

                    {/* User Profile Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="relative h-10 px-2 gap-2 hover:bg-transparent text-zinc-300 hover:text-[#ccff00] transition-colors group"
                            >
                                <PadelRacketIcon className="h-6 w-6 stroke-current" />
                                <span className="font-medium text-sm hidden sm:inline-block group-hover:underline decoration-[#ccff00] underline-offset-4">
                                    {firstName}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal p-4 bg-zinc-900/50">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-base font-medium leading-none text-white">{fullName}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs leading-none text-[#ccff00] font-semibold tracking-wide uppercase">
                                            {getRoleBadge()}
                                        </p>
                                        {profile?.membership_tier === 'VIP' && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gradient-to-r from-amber-200 to-yellow-500 text-black">
                                                VIP
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs leading-none text-zinc-500 truncate pt-1">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <p className="px-2 py-1.5 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Acciones Rápidas</p>

                                {/* SUPER ADMIN */}
                                {userRole === 'super_admin' && (
                                    <>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/admin">
                                                <Dumbbell className="mr-2 h-4 w-4" /> Dashboard Global
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/admin/users">
                                                <User className="mr-2 h-4 w-4" /> Usuarios
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/admin/logs">
                                                <Settings className="mr-2 h-4 w-4" /> Logs de Sistema
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* CLUB OWNER */}
                                {(userRole === 'owner' || userRole === 'club_owner') && (
                                    <>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/club/dashboard">
                                                <Dumbbell className="mr-2 h-4 w-4" /> Dashboard del Club
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/club/bookings">
                                                <Calendar className="mr-2 h-4 w-4" /> Gestión de Canchas
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/club/fixed-members">
                                                <CheckCircle className="mr-2 h-4 w-4" /> Socios Fijos
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* ACADEMY OWNER */}
                                {userRole === 'academy_owner' && (
                                    <>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/academy/dashboard">
                                                <Dumbbell className="mr-2 h-4 w-4" /> Panel de Academia
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/academy/students">
                                                <User className="mr-2 h-4 w-4" /> Mis Alumnos
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/academy/payments">
                                                <CreditCard className="mr-2 h-4 w-4" /> Control de Pagos
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* COACH */}
                                {userRole === 'coach' && (
                                    <>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/coach/schedule">
                                                <Calendar className="mr-2 h-4 w-4" /> Mi Agenda
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/coach/attendance">
                                                <CheckCircle className="mr-2 h-4 w-4" /> Lista de Asistencia
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/coach/payments">
                                                <CreditCard className="mr-2 h-4 w-4" /> Mis Comisiones
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}

                                {/* PLAYER / CLIENT */}
                                {(!userRole || userRole === 'player' || userRole === 'client') && (
                                    <>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/player/bookings">
                                                <Calendar className="mr-2 h-4 w-4" /> Mis Reservas
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white cursor-pointer">
                                            <Link href="/player/classes">
                                                <Dumbbell className="mr-2 h-4 w-4" /> Mis Clases
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator />

                            <DropdownMenuGroup>
                                <p className="px-2 py-1.5 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Cuenta</p>

                                <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white focus:!bg-zinc-800 focus:!text-white cursor-pointer">
                                    <Link href={getProfileLink()}>
                                        <User className="mr-2 h-4 w-4 text-zinc-400" />
                                        <span>Perfil</span>
                                    </Link>
                                </DropdownMenuItem>

                                {/* Settings Link */}
                                <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white focus:!bg-zinc-800 focus:!text-white cursor-pointer">
                                    <Link href="/settings">
                                        <Settings className="mr-2 h-4 w-4 text-zinc-400" />
                                        <span>Ajustes de Cuenta</span>
                                    </Link>
                                </DropdownMenuItem>

                                {/* Role Specific Account Links */}
                                {userRole === 'coach' && (
                                    <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white flex justify-between cursor-pointer">
                                        <Link href="/coach/profile">
                                            <span>Perfil Público</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}

                                {isAdminView && (
                                    <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white flex justify-between cursor-pointer">
                                        <Link href="/settings/billing">
                                            <span>Facturación</span>
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator />

                            {/* BRIDGE ACTIONS (Switch Context) */}
                            <DropdownMenuGroup>
                                {isAdminView ? (
                                    <>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white focus:!bg-zinc-800 focus:!text-white cursor-pointer">
                                            <Link href="/register-business">
                                                <Settings className="mr-2 h-4 w-4" /> Mis Negocios
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white focus:!bg-zinc-800 focus:!text-white cursor-pointer text-emerald-500">
                                            <Link href="/player/explore">
                                                <Dumbbell className="mr-2 h-4 w-4" /> Cambiar a Modo Jugador
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                ) : (
                                    <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white focus:!bg-zinc-800 focus:!text-white cursor-pointer text-emerald-500">
                                        <Link href="/register-business">
                                            <Settings className="mr-2 h-4 w-4" /> Crear Club o Academia
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                {userRole === 'super_admin' && (
                                    <DropdownMenuItem asChild className="hover:!bg-zinc-800 hover:!text-white focus:!bg-zinc-800 focus:!text-white cursor-pointer text-amber-500">
                                        <Link href="/impersonate">
                                            <User className="mr-2 h-4 w-4" /> Impersonar Usuario
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-red-500 hover:!bg-red-500/10 hover:!text-red-500 focus:!bg-red-500/10 focus:!text-red-500 cursor-pointer"
                                onClick={signOut}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Cerrar Sesión</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    )
}
