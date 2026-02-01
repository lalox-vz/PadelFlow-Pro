"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Menu, X, User, LogOut, LayoutDashboard, Dumbbell, CalendarDays, Users, Settings, CreditCard, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageToggle } from "@/components/ui/language-toggle"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo" // This is now PadelFlow Logo
import { PadelRacketIcon } from "@/components/icons/PadelRacketIcon"
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher"
import { NotificationBell } from "@/components/NotificationBell"
import { getDashboardRoute, getHomeRoute } from "@/lib/role-navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Navbar() {
    const { user, profile, userRole } = useAuth() // Use userRole from context
    const { language } = useLanguage() // Keeping for toggles, but mainly static Spanish as per brief
    const [isOpen, setIsOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const router = useRouter()

    // Use userRole from AuthContext (cached and persistent)
    const role = userRole || profile?.role || user?.user_metadata?.role

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const toggleMenu = () => setIsOpen(!isOpen)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    // Simplified High-Retention Navigation
    const navLinks = [
        { name: 'Explorar', href: "/player/explore" },
        { name: 'Para Negocios', href: "/register-business" },
        { name: 'Precios', href: "/pricing" },
    ]

    return (
        <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">

                    {/* Left: Logo - Context-aware destination */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link
                            href={(user && ['owner', 'club_owner', 'academy_owner', 'admin'].includes(role || '')) ? getDashboardRoute(role) : "/"}
                            className="group"
                        >
                            <OlimpoLogo className="h-8 w-auto text-white group-hover:text-[#ccff00] transition-colors" />
                        </Link>
                    </div>

                    {/* Center: Minimalist Navigation */}
                    <div className="hidden md:flex space-x-8 items-center">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-wide"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* Right: Actions */}
                    <div className="hidden md:flex items-center gap-4">
                        <LanguageToggle />

                        {/* Workspace Switcher for Multi-Tenant Users */}
                        {user && (role === 'owner' || role === 'club_owner' || role === 'academy_owner') && (
                            <WorkspaceSwitcher />
                        )}

                        {/* Notification Bell for Logged-in Users */}
                        {user && <NotificationBell />}

                        {/* Quick Dashboard Access for Business Users */}
                        {user && (role === 'owner' || role === 'club_owner' || role === 'academy_owner' || role === 'admin') && (
                            <Button variant="ghost" size="sm" asChild className="text-gray-400 hover:text-white mr-2">
                                <Link href={getDashboardRoute(role)}>
                                    <LayoutDashboard className="h-4 w-4 mr-2" />
                                    <span className="hidden lg:inline">Mi Panel</span>
                                </Link>
                            </Button>
                        )}

                        {user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="text-white hover:text-[#ccff00] hover:bg-white/10 gap-2 px-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold">{profile?.full_name?.split(' ')[0] || 'Mi Cuenta'}</span>
                                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-[#ccff00]">
                                                <PadelRacketIcon className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 bg-[#0A0A0B] border-zinc-800 text-white p-1">
                                    <div className="px-2 py-2 mb-1 border-b border-zinc-800">
                                        <p className="text-sm font-medium text-white">{profile?.full_name || 'Usuario'}</p>
                                        <p className="text-xs text-[#FBBF24] font-semibold uppercase tracking-wider mt-0.5">
                                            {(() => {
                                                if (role === 'owner' || role === 'club_owner') return 'DUEÑO DE CLUB'
                                                if (role === 'academy_owner') return 'DIRECTOR DE ACADEMIA'
                                                if (role === 'admin' || role === 'super_admin') return 'SUPER ADMIN'
                                                if (role === 'coach') return 'COACH'
                                                return 'JUGADOR'
                                            })()}
                                        </p>
                                    </div>

                                    {/* Role Specific Actions */}
                                    {/* SUPER ADMIN */}
                                    {(role === 'admin' || role === 'super_admin') && (
                                        <div className="px-1 py-1">
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/admin">
                                                    <LayoutDashboard className="mr-2 h-4 w-4 text-[#FBBF24]" /> Dashboard Global
                                                </Link>
                                            </DropdownMenuItem>
                                        </div>
                                    )}

                                    {/* CLUB OWNER */}
                                    {(role === 'owner' || role === 'club_owner') && (
                                        <div className="px-1 py-1">
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/club/calendar">
                                                    <CalendarDays className="mr-2 h-4 w-4 text-[#FBBF24]" /> Calendario
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/club/fixed-members">
                                                    <Users className="mr-2 h-4 w-4" /> Socios Fijos
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/club/payments">
                                                    <CreditCard className="mr-2 h-4 w-4" /> Pagos Pendientes
                                                    <span className="ml-auto h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/club/settings">
                                                    <Settings className="mr-2 h-4 w-4" /> Configuración
                                                </Link>
                                            </DropdownMenuItem>
                                        </div>
                                    )}

                                    {/* ACADEMY OWNER */}
                                    {role === 'academy_owner' && (
                                        <div className="px-1 py-1">
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/academy/students">
                                                    <Users className="mr-2 h-4 w-4 text-[#FBBF24]" /> Mis Alumnos
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/academy/programs">
                                                    <Dumbbell className="mr-2 h-4 w-4" /> Programas
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/academy/coaches">
                                                    <UserCheck className="mr-2 h-4 w-4" /> Coaches
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/academy/settings">
                                                    <Settings className="mr-2 h-4 w-4" /> Perfil de Academia
                                                </Link>
                                            </DropdownMenuItem>
                                        </div>
                                    )}

                                    {/* PLAYER */}
                                    {!role || role === 'player' || role === 'client' ? (
                                        <div className="px-1 py-1">
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/player/bookings">
                                                    <Dumbbell className="mr-2 h-4 w-4 text-[#FBBF24]" /> Mis Reservas
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                                <Link href="/player/classes">
                                                    <CalendarDays className="mr-2 h-4 w-4" /> Mis Clases
                                                </Link>
                                            </DropdownMenuItem>
                                        </div>
                                    ) : null}


                                    <DropdownMenuSeparator className="bg-zinc-800 my-1" />

                                    <div className="px-1 py-1">
                                        <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer rounded-md">
                                            <Link href="/settings">
                                                <Settings className="mr-2 h-4 w-4" /> Mi Perfil
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-400 focus:bg-zinc-800 cursor-pointer rounded-md mt-1">
                                            <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                                        </DropdownMenuItem>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <div className="flex items-center gap-4">
                                <Link href="/login" className="text-sm font-semibold text-white hover:text-gray-300">
                                    Ingresar
                                </Link>
                                <Button asChild className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-bold rounded-full px-6">
                                    <Link href="/signup">Registrate</Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden gap-4">
                        <LanguageToggle />
                        <button
                            onClick={toggleMenu}
                            className="text-gray-300 hover:text-white p-2"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="md:hidden absolute top-20 left-0 w-full bg-black/95 backdrop-blur-xl border-b border-white/10 p-6 space-y-6 animate-in slide-in-from-top-5">
                    <div className="flex flex-col space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                className="text-lg font-medium text-gray-300 hover:text-[#ccff00]"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                    <div className="pt-6 border-t border-white/10">
                        {user ? (
                            <div className="grid gap-3">
                                <Button variant="outline" className="w-full justify-start text-white border-white/20" asChild>
                                    <Link href={getDashboardRoute(role)}>
                                        <LayoutDashboard className="mr-2 h-4 w-4" /> Mi Dashboard
                                    </Link>
                                </Button>
                                <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" asChild>
                                    <Link href="/login">Ingresar</Link>
                                </Button>
                                <Button className="w-full bg-[#ccff00] text-black hover:bg-[#b3e600]" asChild>
                                    <Link href="/signup">Registrate</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    )
}
