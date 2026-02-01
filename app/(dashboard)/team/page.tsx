"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Users, UserPlus, Trash2, Shield, User, Clock, X, Lock, Pencil } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface TeamMember {
    id: string
    full_name: string | null
    email: string | null
    role: string
    job_title: string | null
    permissions: string[] | null
    created_at: string
    type: 'member'
}

interface PendingInvitation {
    id: string
    email: string
    role: string
    job_title: string | null
    permissions: string[] | null
    created_at: string
    invited_by: string
    type: 'invitation'
}

type TeamRow = TeamMember | PendingInvitation

export default function TeamPage() {
    const { user, profile } = useAuth()
    const { toast } = useToast()
    const router = useRouter()
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
    const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
    const [loading, setLoading] = useState(true)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Invite form
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<"club_owner" | "club_staff">("club_staff")
    const [inviteJobTitle, setInviteJobTitle] = useState("")
    const [invitePermissions, setInvitePermissions] = useState<string[]>([
        'calendar', 'courts', 'fixed_members', 'cash_register', 'notifications'
    ]) // Default all unchecked or checked? Let's default all checked for convenience.

    const PERMISSIONS_LIST = [
        { id: 'calendar', label: 'Calendario Global', description: 'Ver y gestionar reservas' },
        { id: 'courts', label: 'Gestión de Canchas', description: 'Bloquear pistas y ver estado' },
        { id: 'fixed_members', label: 'Socios Fijos', description: 'Administrar planes recurrentes' },
        { id: 'cash_register', label: 'Cierre de Caja', description: 'Registrar movimientos del turno' },
        { id: 'notifications', label: 'Notificaciones', description: 'Recibir alertas del sistema' },
    ]

    const orgId = profile?.organization_id

    // Permission check
    const canManageTeam = profile?.role === 'club_owner' || profile?.role === 'platform_admin'

    // RBAC Redirect
    useEffect(() => {
        if (profile && profile.role === 'club_staff') {
            toast({
                variant: "destructive",
                title: "Acceso Restringido",
                description: "No tienes permiso para ver esta sección."
            })
            router.push('/club/calendar')
        }
    }, [profile, router, toast])

    useEffect(() => {
        if (orgId && canManageTeam) {
            fetchTeamData()
        } else if (!canManageTeam) {
            setLoading(false)
        }
    }, [orgId, canManageTeam])

    const fetchTeamData = async () => {
        if (!orgId) return

        try {
            // Fetch team members
            const { data: members, error: membersError } = await supabase
                .from('users')
                .select('id, full_name, email, role, job_title, permissions, created_at')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })

            console.log('Miembros encontrados:', members)

            if (membersError) throw membersError

            // Fetch pending invitations
            const { data: invitations, error: invitationsError } = await supabase
                .from('invitations')
                .select('id, email, role, job_title, permissions, created_at, invited_by')
                .eq('organization_id', orgId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (invitationsError) throw invitationsError

            setTeamMembers((members || []).map(m => ({ ...m, type: 'member' as const })))
            setPendingInvitations((invitations || []).map(i => ({ ...i, type: 'invitation' as const })))

        } catch (error: any) {
            console.error('Error fetching team:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo cargar el equipo"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleInvite = async () => {
        if (!inviteEmail || !orgId) return

        setIsSubmitting(true)
        try {
            const { data, error } = await supabase
                .rpc('invite_or_create_pending', {
                    p_email: inviteEmail,
                    p_organization_id: orgId,
                    p_role: inviteRole,
                    p_job_title: inviteJobTitle,
                    p_permissions: inviteRole === 'club_staff' ? invitePermissions : []
                })

            if (error) throw error

            const result = data as { success: boolean; type?: string; error?: string; message?: string }

            if (!result.success) {
                throw new Error(result.error || 'Error al invitar usuario')
            }

            const isExisting = result.type === 'existing_user'

            toast({
                title: isExisting ? "✅ Miembro Añadido" : "📧 Invitación Enviada",
                description: result.message
            })

            setShowInviteModal(false)
            setInviteEmail("")
            setInviteRole("club_staff")
            setInviteJobTitle("")
            setInvitePermissions(['calendar', 'courts', 'fixed_members', 'cash_register', 'notifications'])
            fetchTeamData()

        } catch (error: any) {
            console.error('Error inviting user:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "No se pudo invitar al usuario"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRemoveMember = async (memberId: string, memberEmail: string) => {
        if (memberId === user?.id) {
            toast({
                variant: "destructive",
                title: "Acción No Permitida",
                description: "No puedes eliminarte a ti mismo"
            })
            return
        }

        if (!confirm(`¿Seguro que deseas remover a ${memberEmail} del equipo?`)) {
            return
        }

        try {
            const { error } = await supabase
                .from('users')
                .update({
                    organization_id: null,
                    role: 'player',
                    has_business: false,
                    business_type: null
                })
                .eq('id', memberId)

            if (error) throw error

            toast({
                title: "Miembro Removido",
                description: `${memberEmail} ha sido removido del equipo`
            })

            fetchTeamData()

        } catch (error: any) {
            console.error('Error removing member:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo remover al miembro"
            })
        }
    }

    const handleCancelInvitation = async (invitationId: string, email: string) => {
        if (!confirm(`¿Cancelar la invitación para ${email}?`)) {
            return
        }

        try {
            const { data, error } = await supabase
                .rpc('cancel_invitation', {
                    p_invitation_id: invitationId
                })

            if (error) throw error

            const result = data as { success: boolean; error?: string }
            if (!result.success) {
                throw new Error(result.error || 'Error al cancelar')
            }

            toast({
                title: "Invitación Cancelada",
                description: `La invitación para ${email} ha sido cancelada`
            })

            fetchTeamData()

        } catch (error: any) {
            console.error('Error cancelling invitation:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "No se pudo cancelar la invitación"
            })
        }
    }

    const getRoleBadge = (role: string) => {
        const badges: Record<string, { label: string; color: string; icon: any }> = {
            'platform_admin': { label: 'Admin Plataforma', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Shield },
            'club_owner': { label: 'Socio Admin', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Shield },
            'club_staff': { label: 'Staff / Recepción', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: User },
        }

        const badge = badges[role] || { label: role, color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', icon: User }
        const Icon = badge.icon

        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${badge.color}`}>
                <Icon className="h-3 w-3" />
                {badge.label}
            </span>
        )
    }

    const getPendingBadge = () => {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium bg-zinc-700/30 text-zinc-400 border-zinc-600/30">
                <Clock className="h-3 w-3" />
                Pendiente
            </span>
        )
    }

    // Combine members and invitations for display
    const allRows: TeamRow[] = [
        ...teamMembers,
        ...pendingInvitations
    ]

    if (!canManageTeam) {
        return (
            <div className="min-h-screen bg-zinc-950 text-white p-8">
                <div className="max-w-2xl mx-auto text-center py-16">
                    <Shield className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Acceso Restringido</h1>
                    <p className="text-zinc-400">
                        Solo los propietarios del club pueden acceder a esta página.
                    </p>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-white">Cargando equipo...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            <Users className="h-8 w-8" />
                            Mi Equipo
                        </h1>
                        <p className="text-zinc-400">
                            Gestiona los miembros de tu organización
                        </p>
                    </div>
                    <Button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Añadir Miembro
                    </Button>
                </div>

                {/* Team Table */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-zinc-800/50">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-300">Nombre / Email</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-300">Estado</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-300">Rol</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-zinc-300">Fecha</th>
                                <th className="text-right px-6 py-4 text-sm font-semibold text-zinc-300">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {allRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                        <p>No hay miembros en el equipo todavía</p>
                                        <p className="text-sm mt-1">Invita a tu primer miembro usando el botón de arriba</p>
                                    </td>
                                </tr>
                            ) : (
                                allRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-zinc-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {row.type === 'member' ? (
                                                <div>
                                                    <div className="font-medium">{row.full_name || 'Sin nombre'}</div>
                                                    <div className="text-sm text-zinc-500">{row.email}</div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="font-medium text-zinc-400">{row.email}</div>
                                                    <div className="text-xs text-zinc-500">
                                                        {row.job_title ? `${row.job_title} • ` : ''}
                                                        Usuario no registrado
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {row.type === 'member' ? (
                                                <div className="flex flex-col">
                                                    <span className="inline-flex w-fit items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                                        Activo
                                                    </span>
                                                    {row.job_title && <span className="text-xs text-zinc-500 mt-1">{row.job_title}</span>}
                                                </div>
                                            ) : (
                                                getPendingBadge()
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getRoleBadge(row.role)}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-400 text-sm">
                                            {format(new Date(row.created_at), "d 'de' MMM, yyyy", { locale: es })}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {/* EDIT BUTTON */}
                                            {<Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setInviteEmail(row.email || '')
                                                    setInviteRole(row.role as any)
                                                    setInviteJobTitle(row.job_title || '')
                                                    setInvitePermissions(row.permissions || [])
                                                    setShowInviteModal(true)
                                                }}
                                                className="text-zinc-400 hover:text-white hover:bg-zinc-800 mr-1"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>}

                                            {row.type === 'member' && row.id !== user?.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveMember(row.id, row.email || '')}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {row.type === 'invitation' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleCancelInvitation(row.id, row.email)}
                                                    className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/50"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
                    <div>
                        Miembros activos: {teamMembers.length} | Invitaciones pendientes: {pendingInvitations.length}
                    </div>
                    <div>
                        Total: {allRows.length}
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Añadir Miembro al Equipo</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Invita a un nuevo miembro. Si ya está registrado, se añadirá inmediatamente. Si no, recibirá una invitación pendiente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email del Usuario</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="usuario@ejemplo.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="bg-zinc-900 border-zinc-700"
                            />
                            <p className="text-xs text-zinc-500">
                                Puede ser un usuario registrado o no
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Rol</Label>
                            <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                    <SelectItem value="club_owner">Socio Administrador (Dueño)</SelectItem>
                                    <SelectItem value="club_staff">Staff (Gestión & Caja)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="jobTitle">Cargo / Título (Opcional)</Label>
                            <Input
                                id="jobTitle"
                                placeholder="Ej: Recepcionista de Noche"
                                value={inviteJobTitle}
                                onChange={(e) => setInviteJobTitle(e.target.value)}
                                className="bg-zinc-900 border-zinc-700"
                            />
                        </div>

                        {inviteRole === 'club_staff' && (
                            <div className="space-y-3 pt-2 border-t border-zinc-800">
                                <Label>Permisos Modulares</Label>
                                <div className="grid gap-3">
                                    {PERMISSIONS_LIST.map((perm) => {
                                        const isChecked = invitePermissions.includes(perm.id)
                                        return (
                                            <div key={perm.id} className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                                                <div className="space-y-0.5">
                                                    <div className="text-sm font-medium text-white">{perm.label}</div>
                                                    <div className="text-xs text-zinc-500">{perm.description}</div>
                                                </div>
                                                <Switch
                                                    checked={isChecked}
                                                    onCheckedChange={(checked) => {
                                                        setInvitePermissions(prev =>
                                                            checked
                                                                ? [...prev, perm.id]
                                                                : prev.filter(p => p !== perm.id)
                                                        )
                                                    }}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setShowInviteModal(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleInvite}
                            disabled={!inviteEmail || isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSubmitting ? 'Procesando...' : 'Invitar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
