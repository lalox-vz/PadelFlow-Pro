export type UserRole = 'owner' | 'club_owner' | 'academy_owner' | 'coach' | 'student' | 'player' | 'client' | 'admin' | 'super_admin' | string | undefined | null

export function getDashboardRoute(role: UserRole, onboardingStatus: string = 'completed'): string {
    if (!role) return '/'

    // Normalize role
    const r = role.toLowerCase()

    // NEW: Onboarding Fork (Bridge)
    // If onboarding is strictly 'not_started', force Welcome flow regardless of role (unless admin)
    if (onboardingStatus === 'not_started' && r !== 'admin' && r !== 'super_admin') {
        return '/welcome'
    }

    if (r === 'owner' || r === 'club_owner') return '/club/dashboard'
    if (r === 'club_staff') return '/club/calendar' // Redirect Staff directly to Calendar
    if (r === 'academy_owner') return '/academy/dashboard'
    if (r === 'admin' || r === 'super_admin') return '/admin'
    if (r === 'coach') return '/coach/schedule'

    // Default for players/students/clients
    return '/player/explore'
}

/**
 * Get the home route for a given role (Logo/Home icon destination)
 * @param role - User's role
 * @returns The home/dashboard URL for that role
 */
export function getHomeRoute(role: UserRole): string {
    return getDashboardRoute(role)
}

/**
 * Get dashboard title based on role
 */
export function getDashboardTitle(role: UserRole): string {
    if (!role) return 'Panel'

    const r = role.toLowerCase()

    if (r === 'super_admin') return 'Super Admin'
    if (r === 'owner' || r === 'club_owner') return 'Panel del Club'
    if (r === 'academy_owner') return 'Panel de Academia'
    if (r === 'coach') return 'Mi Agenda'
    if (r === 'admin') return 'Panel de Administración'

    return 'Explorar'
}

/**
 * Role-specific profile dropdown items
 */
export interface DropdownItem {
    label: string
    href: string
    icon: string
}

export function getProfileDropdownItems(role: UserRole): DropdownItem[] {
    if (!role) return []

    const r = role.toLowerCase()

    if (r === 'super_admin' || r === 'admin') {
        return [
            { label: 'Global Dashboard', href: '/admin', icon: 'LayoutDashboard' },
            { label: 'Entidades', href: '/admin/entities', icon: 'Building2' },
            { label: 'Usuarios', href: '/admin/users', icon: 'Users' },
            { label: 'Configuración', href: '/settings', icon: 'Settings' },
        ]
    }

    if (r === 'owner' || r === 'club_owner') {
        return [
            { label: 'Panel del Club', href: '/club/dashboard', icon: 'LayoutDashboard' },
            { label: 'Gestión de Canchas', href: '/club/courts', icon: 'Dumbbell' },
            { label: 'Calendario Global', href: '/club/calendar', icon: 'Calendar' },
            { label: 'Ingresos', href: '/club/revenue', icon: 'DollarSign' },
            { label: 'Configuración', href: '/club/settings', icon: 'Settings' },
        ]
    }

    if (r === 'academy_owner') {
        return [
            { label: 'Panel de Academia', href: '/academy/dashboard', icon: 'LayoutDashboard' },
            { label: 'Programas', href: '/academy/programs', icon: 'Dumbbell' },
            { label: 'Gestión de Alumnos', href: '/academy/students', icon: 'Users' },
            { label: 'Coaches', href: '/academy/coaches', icon: 'UserCheck' },
            { label: 'Horarios', href: '/academy/schedule', icon: 'Calendar' },
        ]
    }

    if (r === 'coach') {
        return [
            { label: 'Mi Agenda', href: '/coach/schedule', icon: 'Calendar' },
            { label: 'Mis Clases', href: '/coach/classes', icon: 'Dumbbell' },
            { label: 'Mis Alumnos', href: '/coach/students', icon: 'Users' },
            { label: 'Configuración', href: '/settings', icon: 'Settings' },
        ]
    }

    // Default for players/clients
    return [
        { label: 'Explorar', href: '/player/explore', icon: 'Globe' },
        { label: 'Mis Reservas', href: '/player/bookings', icon: 'Calendar' },
        { label: 'Mis Clases', href: '/player/classes', icon: 'Dumbbell' },
        { label: 'Mi Perfil', href: '/settings', icon: 'User' },
        { label: 'Configuración', href: '/settings', icon: 'Settings' },
    ]
}

/**
 * Check if a role should see "Mis Reservas" (players only)
 */
export function shouldShowBookings(role: UserRole): boolean {
    if (!role) return false
    const r = role.toLowerCase()
    return r === 'client' || r === 'player' || r === 'student'
}

/**
 * Check if a role is administrative
 */
export function isAdminRole(role: UserRole): boolean {
    if (!role) return false
    const r = role.toLowerCase()
    return ['super_admin', 'owner', 'club_owner', 'academy_owner', 'admin'].includes(r)
}
