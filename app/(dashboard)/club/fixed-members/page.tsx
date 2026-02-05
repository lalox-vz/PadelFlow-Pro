"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Calendar, Umbrella, MoreHorizontal, FileText, CheckCircle2, AlertTriangle, X, Banknote, Pencil, Save, CreditCard, MapPin, Clock, Search, Check, UserPlus } from "lucide-react"
import { createClubMember } from "@/app/actions/crm"
import { createRecurringPlan, updateRecurringPlan, getRecurringPlans, settlePlanBilling, getPendingBookings, extendPlanDueToIncident } from "@/app/actions/plans"
import { format, parseISO, addWeeks, addMinutes, isBefore, isAfter, startOfDay, endOfMonth, startOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

// --- TYPES ---
// --- TYPES ---
interface RecurringPlan {
    id: string
    user: { full_name: string; email: string; phone: string } | null
    court_id: string
    day_of_week: number
    start_time: string
    duration_mins: number
    start_date: string
    end_date: string
    price: number // Maps to dynamic calculated unit price in frontend or legacy
    total_price?: number // Actual DB column for contract value
    active: boolean
    payment_advance?: boolean
    remaining_sessions?: number
    total_sessions?: number
    pending_debt?: number // Calculated by backend
    member_id?: string | null
    member?: { full_name: string; email?: string; phone?: string } | null
}

interface UserSummary {
    id: string
    user_id?: string | null
    full_name: string
    email?: string | null
    phone?: string | null
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function FixedMembersPage() {
    const { user, profile } = useAuth()
    const { toast } = useToast()
    const router = useRouter()
    const [plans, setPlans] = useState<RecurringPlan[]>([])
    const [loading, setLoading] = useState(true)
    const [courtsMap, setCourtsMap] = useState<Record<string, string>>({})
    const [orgUsers, setOrgUsers] = useState<UserSummary[]>([])
    const [clubMembers, setClubMembers] = useState<UserSummary[]>([])
    const [courtsList, setCourtsList] = useState<any[]>([])

    // Search State
    const [searchQuery, setSearchQuery] = useState("")
    const [memberOpen, setMemberOpen] = useState(false)
    const [selectedMember, setSelectedMember] = useState<UserSummary | null>(null)

    // Constants
    const TIME_SLOTS = [
        "07:00", "08:30", "10:00", "11:30", "13:00",
        "14:30", "16:00", "17:30", "19:00", "20:30", "22:00", "23:30"
    ]

    const DURATIONS = [
        { label: "1 Mes (4 semanas)", weeks: 4 },
        { label: "3 Meses (12 semanas)", weeks: 12 },
        { label: "6 Meses (24 semanas)", weeks: 24 },
        { label: "1 Año (52 semanas)", weeks: 52 },
    ]

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [selectedDuration, setSelectedDuration] = useState<string>("12")
    const [customWeeks, setCustomWeeks] = useState<string>("")

    // Incident Modal State
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false)
    const [incidentPlan, setIncidentPlan] = useState<RecurringPlan | null>(null)
    const [incidentBooking, setIncidentBooking] = useState<any>(null)
    const [incidentReason, setIncidentReason] = useState<string>("Lluvia")


    // Management Modal State
    const [viewingPlan, setViewingPlan] = useState<RecurringPlan | null>(null)
    const [isEditingPlan, setIsEditingPlan] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)

    // Smart Debt Manager State
    const [pendingList, setPendingList] = useState<any[]>([])
    const [selectedDebtIds, setSelectedDebtIds] = useState<string[]>([])
    const [showDebtSelector, setShowDebtSelector] = useState(false)

    const [editForm, setEditForm] = useState({
        courtId: '',
        dayOfWeek: '0',
        startTime: '',
        price: 0,
        paymentAdvance: false
    })

    const [formData, setFormData] = useState({
        clubMemberId: '',
        memberId: '',
        userId: '',
        courtId: '',
        dayOfWeek: '1',
        startTime: '19:00',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addWeeks(new Date(), 12), 'yyyy-MM-dd'),
        price: '0',
        advancePayment: false
    })

    const orgId = profile?.organization_id
    const isOwner = profile?.role === 'club_owner'

    useEffect(() => {
        if (orgId) fetchData()
    }, [orgId])

    // Sync Edit Form when Viewing Plan Changes
    useEffect(() => {
        if (viewingPlan) {
            // Calculate Unit Price safely
            // Logic: Total Contract Price / Total Sessions
            let unitPrice = viewingPlan.price || 0
            if (viewingPlan.total_price && viewingPlan.total_sessions && viewingPlan.total_sessions > 0) {
                unitPrice = Math.round(viewingPlan.total_price / viewingPlan.total_sessions)
            }

            setEditForm({
                courtId: viewingPlan.court_id,
                dayOfWeek: String(viewingPlan.day_of_week),
                startTime: viewingPlan.start_time.slice(0, 5),
                price: unitPrice,
                paymentAdvance: viewingPlan.payment_advance || false
            })
            setIsEditingPlan(false)
        }
    }, [viewingPlan])

    // Auto-calculate Start Date when Day changes (Smart Snap) - REMOVED FOR FLEXIBILITY
    // Now we allow user to pick ANY start date. 
    // We only visually warn if the Day of Week doesn't match the Date, 
    // but the backend handles the "Next Occurrence" logic safely.
    // However, for UX, if we change Day of Week, we MIGHT want to suggest the next matching date?
    // Let's Keep it simple: User picks Date. We derive Day of Week? 
    // OR User picks Day of Week, and we default StartDate to next occurrence, but allow Edit?

    // Better UX: When Day of Week changes, if the current StartDate Day != Target Day, specific snap.
    useEffect(() => {
        const targetDay = parseInt(formData.dayOfWeek)
        const currentParams = parseISO(formData.startDate)

        // Only snap if meaningful change? 
        // Actually, let's NOT snap automatically on mount, only on interaction.
        // But since this runs on formData change...

        if (currentParams.getDay() !== targetDay) {
            let next = new Date(currentParams)
            while (next.getDay() !== targetDay) {
                next.setDate(next.getDate() + 1)
            }
            // Update smoothly
            // setFormData... avoiding loop?
            // The previous logic was causing rigidity.
            // Let's just update ONLY if the user hasn't explicitly typed a date?
            // Hard to track. 
            // World Class approach: Reactively update, but allow user to change date back if they really want (though it would be invalid).
            // The backend aligns it. Let's just snap forward to help them.
            setFormData(prev => ({
                ...prev,
                startDate: format(next, 'yyyy-MM-dd')
            }))
        }
    }, [formData.dayOfWeek])

    // Auto-calculate End Date
    useEffect(() => {
        let weeks = 0
        if (selectedDuration === 'custom') {
            weeks = parseInt(customWeeks) || 0
        } else {
            weeks = parseInt(selectedDuration)
        }

        if (weeks > 0 && formData.startDate) {
            const start = parseISO(formData.startDate)
            const end = addWeeks(start, weeks)
            setFormData(prev => ({ ...prev, endDate: format(end, 'yyyy-MM-dd') }))
        }
    }, [formData.startDate, selectedDuration, customWeeks])

    const fetchData = async () => {
        if (!orgId) {
            console.error("🔥 Error: orgId is undefined/null")
            return
        }

        setLoading(true)
        try {
            // 0. VAMPIRE HUNTER is now handled inside getRecurringPlans

            // 1. Fetch Courts (All)
            const { data: courtsData, error: courtsError } = await supabase
                .from('courts')
                .select('id, name, is_active')
                .eq('club_id', orgId)

            if (courtsError) throw courtsError

            const courts = courtsData || []
            setCourtsList(courts)

            const cMap: Record<string, string> = {}
            courts.forEach((c: any) => cMap[c.id] = c.name + (!c.is_active ? ' (Inactiva)' : ''))
            setCourtsMap(cMap)

            // 2. Fetch Users
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, full_name, email')
                .eq('organization_id', orgId)

            if (usersError) console.error("Error fetching users:", usersError)
            setOrgUsers(usersData || [])

            // 2b. Fetch Club Members (CRM)
            const { data: membersData, error: membersError } = await supabase
                .from('club_members')
                .select('id, user_id, full_name, email, phone')
                .eq('entity_id', orgId)

            if (membersError) console.error("Error fetching members:", membersError)
            setClubMembers(membersData || [])

            // 3. Fetch Plans
            await reloadPlans()

        } catch (error: any) {
            console.error("🔥 Error general en fetch:", error)
            toast({ title: "Error", description: "Fallo en carga de datos.", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const reloadPlans = async () => {
        if (!orgId) return
        try {
            const enriched = await getRecurringPlans(orgId)
            // CRITICAL FIX: Map DB total_price to UI unit price
            const uiPlans = enriched.map((p: any) => ({
                ...p,
                price: (p.total_price && p.total_sessions && p.total_sessions > 0)
                    ? Math.round(p.total_price / p.total_sessions)
                    : (p.price || 0)
            }))
            setPlans(uiPlans as RecurringPlan[])
        } catch (error) {
            console.error("Error loading plans:", error)
        }
    }

    // --- MANAGEMENT HANDLERS ---

    const handleSaveChanges = async () => {
        if (!viewingPlan) return
        setIsSaving(true)

        try {
            // 1. Define updates
            const updates = {
                court_id: editForm.courtId,
                day_of_week: parseInt(editForm.dayOfWeek),
                start_time: editForm.startTime + ':00',
                total_price: editForm.price, // Keep for backward compatibility if column exists, but rely on logic below
                price: editForm.price,
                payment_advance: editForm.paymentAdvance
            }

            // 2. Call Server Action (Smart Update)
            const result = await updateRecurringPlan({
                planId: viewingPlan.id,
                courtId: editForm.courtId,
                dayOfWeek: parseInt(editForm.dayOfWeek),
                startTime: editForm.startTime,
                price: editForm.price,
                paymentAdvance: editForm.paymentAdvance
            })

            if (!result.success) throw new Error(result.error)

            toast({ title: "Plan Actualizado", description: "El plan y sus reservas han sido reprogramados." })

            setViewingPlan({ ...viewingPlan, ...updates, start_time: editForm.startTime + ':00' } as any)
            setIsEditingPlan(false)
            reloadPlans()

        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: error.message || "Error al actualizar.", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    // --- INCIDENT MANAGER LOGIC ---

    const handleOpenIncident = async (plan: RecurringPlan) => {
        setIncidentPlan(plan)
        setLoading(true)
        try {
            const now = new Date().toISOString()
            const { data } = await supabase
                .from('bookings')
                .select('*')
                .eq('recurring_plan_id', plan.id)
                .gte('start_time', now)
                .neq('payment_status', 'canceled')
                .order('start_time', { ascending: true })
                .limit(1)
                .single()

            if (data) {
                setIncidentBooking(data)
                setIsIncidentModalOpen(true)
            } else {
                toast({ title: "Sin reservas futuras", description: "Este plan no tiene reservas activas futuras." })
            }
        } catch (e) {
            console.error(e)
            toast({ title: "Error", description: "No se pudo cargar la próxima reserva.", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleExecuteIncident = async () => {
        if (!incidentPlan || !incidentBooking) return
        setIsSaving(true)
        try {
            const result = await extendPlanDueToIncident(incidentPlan.id, incidentBooking.id, incidentReason)
            if (!result.success) throw new Error(result.error)

            toast({
                title: "Contrato extendido 1 semana",
                description: `Se canceló la sesión del ${format(parseISO(incidentBooking.start_time), 'dd/MM')} y se creó una nueva para ${result.newDate}.`,
                className: "bg-blue-600 border-none text-white shadow-xl"
            })

            setIsIncidentModalOpen(false)
            reloadPlans()
            router.refresh()
        } catch (e: any) {
            console.error(e)
            toast({ title: "Error", description: e.message, variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    // --- DEBT MANAGER LOGIC ---

    const handleInitiateSettlement = async (plan?: RecurringPlan) => {
        const targetPlan = plan || viewingPlan
        if (!targetPlan) return

        // If called from row, set viewing plan main state
        if (plan) setViewingPlan(plan)

        setIsSaving(true)
        try {
            const pending = await getPendingBookings(targetPlan.id)
            setPendingList(pending)
            setSelectedDebtIds(pending.map((b: any) => b.id)) // Select all by default
            setShowDebtSelector(true)
        } catch (error) {
            toast({ title: "Error", description: "No se pudo cargar la deuda.", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const handleExecuteSettlement = async () => {
        if (!viewingPlan || selectedDebtIds.length === 0) return

        setIsSaving(true)
        try {
            const { count, totalAmount } = await settlePlanBilling(viewingPlan.id, "", selectedDebtIds)

            toast({
                title: "Pago Exitoso",
                description: `Se cobraron $${totalAmount} (${count} reservas).`,
                className: "bg-emerald-600 border-none text-white font-bold shadow-xl"
            })

            // Optimistic UI Update & View Switch
            setViewingPlan(prev => prev ? ({ ...prev, pending_debt: Math.max(0, (prev.pending_debt || 0) - totalAmount) }) : null)
            setShowDebtSelector(false)

            // Server Sync
            router.refresh()
            reloadPlans()
        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    // Legacy Batch Pay (kept for reference or full month shortcut if needed)
    const handlePayMonthBatch = handleInitiateSettlement // Upgrade to Smart Flow

    const promptDeactivatePlan = (planId: string) => {
        setDeletingPlanId(planId)
    }

    const executeDeactivation = async () => {
        if (!deletingPlanId) return

        setIsSaving(true)
        try {
            // 1. Deactivate Plan
            const { error: upErr } = await supabase.from('recurring_plans').update({ active: false }).eq('id', deletingPlanId)
            if (upErr) throw upErr

            // 2. Cancel Future Bookings (Soft Delete)
            // We use soft delete to avoid Foreign Key violations in the audit logs
            const now = new Date().toISOString()
            const { error: delErr } = await supabase
                .from('bookings')
                .update({ payment_status: 'canceled' })
                .eq('recurring_plan_id', deletingPlanId)
                .gte('start_time', now)

            if (delErr) throw delErr

            toast({ title: "Plan Cancelado", description: "El plan ha sido desactivado y sus reservas futuras canceladas." })
            reloadPlans()
            setDeletingPlanId(null)
            if (viewingPlan?.id === deletingPlanId) setViewingPlan(null) // Close modal if open
        } catch (e: any) {
            console.error(e)
            toast({ title: "Error", description: "No se pudo cancelar el plan: " + e.message, variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    // --- CREATE LOGIC ---

    const handleCreatePlan = async () => {
        if ((!formData.userId && !formData.memberId) || !formData.courtId) {
            toast({ title: "Faltan datos", description: "Selecciona usuario/socio y cancha", variant: "destructive" })
            return
        }

        setCreating(true)
        try {
            // Server Action Call
            const result = await createRecurringPlan({
                orgId: orgId!,
                userId: formData.userId,
                memberId: formData.memberId,
                courtId: formData.courtId,
                dayOfWeek: parseInt(formData.dayOfWeek),
                startTime: formData.startTime,
                startDate: formData.startDate,
                endDate: formData.endDate,
                price: parseFloat(formData.price),
                paymentAdvance: formData.advancePayment
            })

            if (!result.success) {
                toast({ title: "No se pudo crear", description: result.error, variant: "destructive" })
                return
            }

            toast({ title: "Plan Creado", description: `Se han configurado ${result.count} sesiones.` })
            setIsCreateModalOpen(false)
            reloadPlans()

        } catch (error: any) {
            console.error(error)
            toast({ title: "Error Fatal", description: error.message, variant: "destructive" })
        } finally {
            setCreating(false)
        }
    }

    const getDayName = (dayIndex: number) => DAYS[dayIndex] || 'Desconocido'

    if (loading) return <div className="flex justify-center h-[50vh] items-center"><Loader2 className="animate-spin text-emerald-500" /></div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Socios Fijos</h1>
                        <p className="text-zinc-400">Gestiona los abonos y reservas recurrentes.</p>
                    </div>
                </div>

                {/* Action Panel */}
                <div className="flex justify-end">
                    {isOwner && (
                        <>
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 shadow-md"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Plan
                            </Button>

                            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Crear Plan Recurrente</DialogTitle>
                                        <DialogDescription>Configura el horario fijo y la duración.</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">

                                        {/* User & Court Row */}
                                        {/* User & Court Row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Native Smart Search (Crash Proof) */}
                                            <div className="flex flex-col gap-2 relative">
                                                <Label>Socio</Label>
                                                <div className="relative">
                                                    <div className="flex items-center border border-zinc-700 rounded-md bg-zinc-900 focus-within:ring-2 focus-within:ring-blue-600">
                                                        <Search className="h-4 w-4 ml-3 text-zinc-500" />
                                                        <input
                                                            type="text"
                                                            placeholder="Nombre o teléfono..."
                                                            className="flex-1 bg-transparent border-none text-white p-2 placeholder:text-zinc-500 focus:outline-none text-sm"
                                                            value={searchQuery}
                                                            onChange={(e) => {
                                                                setSearchQuery(e.target.value)
                                                                if (!memberOpen) setMemberOpen(true)
                                                            }}
                                                            onFocus={() => setMemberOpen(true)}
                                                        />
                                                        {selectedMember && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedMember(null)
                                                                    setSearchQuery('')
                                                                    setFormData(prev => ({ ...prev, memberId: '', userId: '' }))
                                                                }}
                                                                className="mr-2 text-zinc-500 hover:text-white"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Dropdown Results */}
                                                    {memberOpen && searchQuery.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl z-50 max-h-[200px] overflow-y-auto">
                                                            {(clubMembers || [])
                                                                .filter(m =>
                                                                    (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                    (m.phone || '').includes(searchQuery)
                                                                )
                                                                .slice(0, 10)
                                                                .map((member) => (
                                                                    <div
                                                                        key={member.id}
                                                                        onClick={() => {
                                                                            setSelectedMember(member)
                                                                            setSearchQuery(member.full_name)
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                clubMemberId: member.id,
                                                                                memberId: member.id, // Ensure compatibility
                                                                                userId: member.user_id || ''
                                                                            }))
                                                                            setMemberOpen(false)
                                                                        }}
                                                                        className="flex items-center justify-between p-2 hover:bg-zinc-800 cursor-pointer text-sm text-zinc-200"
                                                                    >
                                                                        <div className="flex flex-col">
                                                                            <span className="font-medium">{member.full_name}</span>
                                                                            {member.phone && <span className="text-xs text-zinc-500">{member.phone}</span>}
                                                                        </div>
                                                                        {selectedMember?.id === member.id && <Check className="h-4 w-4 text-emerald-500" />}
                                                                    </div>
                                                                ))}

                                                            {/* Empty State / Create Action */}
                                                            {clubMembers && clubMembers.filter(m => (m.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                                                <div className="p-2">
                                                                    <p className="text-xs text-zinc-500 mb-2 px-2">No encontrado en el CRM.</p>
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                const newMember = await createClubMember(orgId!, searchQuery)
                                                                                // Convert to UserSummary format
                                                                                const summary: UserSummary = {
                                                                                    ...newMember,
                                                                                }
                                                                                setClubMembers(prev => [...prev, summary])
                                                                                setSelectedMember(summary)
                                                                                setSearchQuery(summary.full_name)
                                                                                setFormData(prev => ({ ...prev, memberId: summary.id, userId: summary.user_id || '' }))
                                                                                setMemberOpen(false)
                                                                                toast({ title: "Cliente Creado", description: `${summary.full_name} añadido.` })
                                                                            } catch (err: any) {
                                                                                toast({ title: "Error", description: err.message, variant: "destructive" })
                                                                            }
                                                                        }}
                                                                        className="w-full flex items-center justify-center gap-2 p-2 bg-[#ccff00] text-black rounded font-medium hover:bg-[#b3e600] transition-colors"
                                                                    >
                                                                        <UserPlus className="h-4 w-4" />
                                                                        Crear "{searchQuery}"
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label>Cancha</Label>
                                                <Select onValueChange={(v) => setFormData({ ...formData, courtId: v })}>
                                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                                        <SelectValue placeholder="Cancha..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                        {courtsList.filter(c => c.is_active).map(c => (
                                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Day & Time Row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Día de la Semana</Label>
                                                <Select onValueChange={(v) => setFormData({ ...formData, dayOfWeek: v })} defaultValue={formData.dayOfWeek}>
                                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                        {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Horario (Bloque 90m)</Label>
                                                <Select onValueChange={(v) => setFormData({ ...formData, startTime: v })} defaultValue={formData.startTime}>
                                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white max-h-[200px]">
                                                        {TIME_SLOTS.map((slot) => (
                                                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Duration Row */}
                                        <div className="grid gap-2">
                                            <Label>Duración del Plan</Label>
                                            <div className="flex gap-2">
                                                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                                                    <SelectTrigger className="bg-zinc-900 border-zinc-700 flex-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                        {DURATIONS.map((d) => (
                                                            <SelectItem key={d.weeks} value={String(d.weeks)}>{d.label}</SelectItem>
                                                        ))}
                                                        <SelectItem value="custom">Personalizado...</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {selectedDuration === 'custom' && (
                                                    <Input
                                                        type="number"
                                                        placeholder="Semanas"
                                                        className="bg-zinc-900 border-zinc-700 w-24"
                                                        value={customWeeks}
                                                        onChange={e => setCustomWeeks(e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Dates Info (Read Only End Date) */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Fecha Inicio</Label>
                                                <Input type="date" className="bg-zinc-900 border-zinc-700"
                                                    value={formData.startDate}
                                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label className="text-zinc-400">Fecha Fin (Calculada)</Label>
                                                <div className="h-10 px-3 py-2 rounded-md border border-zinc-800 bg-zinc-900/50 text-zinc-400 text-sm flex flex-col justify-center">
                                                    <span>{format(parseISO(formData.endDate), "d 'de' MMMM, yyyy", { locale: es })}</span>
                                                </div>
                                                <p className="text-xs text-emerald-500/80 text-right mt-1">
                                                    Se generarán aprox. {selectedDuration === 'custom' ? (parseInt(customWeeks) || 0) : selectedDuration} reservas
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label>Precio por Sesión (Override)</Label>
                                            <Input type="number" className="bg-zinc-900 border-zinc-700"
                                                placeholder="Ej: 40 (Por partido)"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            />
                                            {/* PREVIEW TOTAL */}
                                            {formData.price && parseInt(formData.price) > 0 && (
                                                <p className="text-xs text-blue-400 font-medium text-right mt-1">
                                                    Total del Contrato: <span className="text-white">${(parseInt(formData.price) * (selectedDuration === 'custom' ? (parseInt(customWeeks) || 0) : parseInt(selectedDuration)))}</span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                            <Checkbox
                                                id="advancePayment"
                                                checked={formData.advancePayment}
                                                onCheckedChange={(checked) => setFormData({ ...formData, advancePayment: checked as boolean })}
                                                className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                            />
                                            <div className="grid gap-1.5 leading-none">
                                                <Label htmlFor="advancePayment" className="font-medium cursor-pointer text-white">
                                                    Pago Adelantado
                                                </Label>
                                                <p className="text-xs text-zinc-400">
                                                    Si se activa, todas las reservas generadas nacerán como <span className="text-emerald-400">Pagadas</span>.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreatePlan} disabled={creating} className="bg-emerald-600 w-full hover:bg-emerald-700">
                                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar Reservas y Guardar"}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Planes Activos</CardTitle>
                    <CardDescription>Listado de socios con horarios fijos asignados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-zinc-900">
                                <TableHead className="text-zinc-400">Socio</TableHead>
                                <TableHead className="text-zinc-400">Cancha Fija</TableHead>
                                <TableHead className="text-zinc-400">Horario</TableHead>
                                <TableHead className="text-zinc-400">Próximo Vencimiento</TableHead>
                                <TableHead className="text-zinc-400">Estado</TableHead>
                                <TableHead className="text-center text-zinc-400">Sesiones</TableHead>
                                <TableHead className="text-right text-zinc-400">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                        No hay socios fijos activos.
                                    </TableCell>
                                </TableRow>
                            ) : plans.map((plan) => (
                                <TableRow key={plan.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white">{plan.user?.full_name || plan.member?.full_name || 'Sin nombre'}</span>
                                            <span className="text-xs text-zinc-500">{plan.user?.phone || plan.member?.phone || plan.user?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-zinc-300">
                                        {courtsMap[plan.court_id] || 'Cancha Desconocida'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm text-zinc-300">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3 text-emerald-500" />
                                                {getDayName(plan.day_of_week)} - {plan.start_time.slice(0, 5)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-zinc-300">
                                        {format(parseISO(plan.end_date), "d 'de' MMM, yyyy", { locale: es })}
                                    </TableCell>
                                    <TableCell>
                                        {(plan.pending_debt || 0) > 0 ? (
                                            <Badge
                                                variant="outline"
                                                onClick={() => setViewingPlan(plan)}
                                                className="bg-red-500/10 text-red-400 border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
                                            >
                                                Deuda: ${plan.pending_debt}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                                Al día
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center">
                                            {/* Progress Bar Logic */}
                                            {(() => {
                                                const total = plan.total_sessions || 1
                                                const remaining = plan.remaining_sessions || 0
                                                const completed = total - remaining
                                                const percent = Math.min(100, Math.max(0, (completed / total) * 100))

                                                return (
                                                    <div className="w-24">
                                                        <div className="flex justify-between text-xs mb-1 text-zinc-400">
                                                            <span>{completed}/{total}</span>
                                                            <span>{Math.round(percent)}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500" style={{ width: `${percent}%` }}></div>
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => {
                                                    setViewingPlan(plan)
                                                    setIsEditingPlan(true)
                                                }}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar Plan
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleInitiateSettlement(plan)}>
                                                    <CreditCard className="mr-2 h-4 w-4" /> Gestionar Pagos
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleOpenIncident(plan)
                                                }}>
                                                    <Umbrella className="mr-2 h-4 w-4" /> Gestionar Incidencia
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-zinc-800" />
                                                <DropdownMenuItem
                                                    className="text-red-400 focus:text-red-400"
                                                    onClick={() => promptDeactivatePlan(plan.id)}
                                                >
                                                    <X className="mr-2 h-4 w-4" /> Cancelar Plan
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* INCIDENT MODAL */}
            <Dialog open={isIncidentModalOpen} onOpenChange={setIsIncidentModalOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Umbrella className="h-5 w-5 text-blue-400" />
                            Gestionar Incidencia
                        </DialogTitle>
                        <DialogDescription>
                            Reprogramar sesión debido a lluvia o causa mayor.
                        </DialogDescription>
                    </DialogHeader>

                    {incidentBooking ? (
                        <div className="space-y-4 py-4">
                            <div className="bg-zinc-900 p-4 rounded-md border border-zinc-800">
                                <Label className="text-xs text-zinc-500 uppercase tracking-widest">Próxima Sesión Afectada</Label>
                                <div className="mt-2 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-lg text-white">
                                            {format(parseISO(incidentBooking.start_time), "EEEE d 'de' MMMM", { locale: es })}
                                        </span>
                                        <span className="text-sm text-zinc-400">
                                            {incidentBooking.start_time.slice(11, 16)} - {courtsMap[incidentBooking.court_id]}
                                        </span>
                                    </div>
                                    <Badge variant={incidentBooking.payment_status === 'paid' ? 'default' : 'outline'} className={incidentBooking.payment_status === 'paid' ? "bg-emerald-500/20 text-emerald-400" : "text-yellow-400 border-yellow-500/30"}>
                                        {incidentBooking.payment_status === 'paid' ? 'Pagada' : 'Pendiente'}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Acción a realizar</Label>
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                    <h4 className="text-sm font-medium text-blue-400 mb-1">Saltar y Extender (Push to End)</h4>
                                    <p className="text-xs text-zinc-300">
                                        Se <strong>cancelará</strong> esta sesión y se creará una nueva automáticamente
                                        al final del contrato (una semana después de la última fecha).
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Motivo</Label>
                                <Select value={incidentReason} onValueChange={setIncidentReason}>
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                        <SelectItem value="Lluvia">Lluvia / Clima</SelectItem>
                                        <SelectItem value="Mantenimiento">Mantenimiento de Cancha</SelectItem>
                                        <SelectItem value="Ausencia Justificada">Ausencia Justificada</SelectItem>
                                        <SelectItem value="Otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-zinc-500">Cargando información...</div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsIncidentModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleExecuteIncident} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Cambio"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={!!viewingPlan} onOpenChange={(open) => {
                if (!open) {
                    setViewingPlan(null)
                    setShowDebtSelector(false)
                    setPendingList([])
                }
            }}>
                <DialogContent className="bg-black/95 border-zinc-800 text-white sm:max-w-2xl p-0 overflow-hidden shadow-2xl h-[600px] flex flex-col">
                    {viewingPlan && !showDebtSelector ? (
                        <>
                            {/* --- STANDARD VIEW --- */}

                            {/* Header */}
                            <div className="bg-zinc-900/60 p-6 border-b border-zinc-800 flex items-center gap-4 shrink-0">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg border-2 border-zinc-900">
                                    <span className="text-xl font-bold">{viewingPlan.user?.full_name?.[0] || 'U'}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-bold text-white">{viewingPlan.user?.full_name || viewingPlan.member?.full_name || 'Sin Nombre'}</h2>
                                        <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30">
                                            Socio Fijo Activo
                                        </Badge>
                                    </div>
                                    <p className="text-zinc-400 text-sm flex items-center gap-2">
                                        <Umbrella className="h-3 w-3" /> Contrato ID: {viewingPlan.id.slice(0, 8)}
                                    </p>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                                {/* Main Columns */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Logistics Column */}
                                    <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800 space-y-4">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800/50">
                                            <Calendar className="h-4 w-4 text-blue-400" />
                                            <h3 className="font-semibold text-zinc-200">Logística</h3>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500 uppercase tracking-widest">Cancha</Label>
                                                {isEditingPlan ? (
                                                    <Select value={editForm.courtId} onValueChange={(v) => setEditForm(prev => ({ ...prev, courtId: v }))}>
                                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-9 focus:ring-blue-500/20"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-zinc-900 border-zinc-700">{courtsList.filter(c => c.is_active || c.id === editForm.courtId).map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                                                    </Select>
                                                ) : <p className="font-medium text-white">{courtsMap[viewingPlan.court_id]}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500 uppercase tracking-widest">Día</Label>
                                                {isEditingPlan ? (
                                                    <Select value={editForm.dayOfWeek} onValueChange={(v) => setEditForm(prev => ({ ...prev, dayOfWeek: v }))}>
                                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-9 focus:ring-blue-500/20"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-zinc-900 border-zinc-700">{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                ) : <p className="font-medium text-white">{getDayName(viewingPlan.day_of_week)}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500 uppercase tracking-widest">Hora</Label>
                                                {isEditingPlan ? (
                                                    <Select value={editForm.startTime} onValueChange={(v) => setEditForm(prev => ({ ...prev, startTime: v }))}>
                                                        <SelectTrigger className="bg-zinc-900 border-zinc-700 h-9 focus:ring-blue-500/20"><SelectValue /></SelectTrigger>
                                                        <SelectContent className="bg-zinc-900 border-zinc-700 max-h-[200px]">{TIME_SLOTS.map((slot) => (<SelectItem key={slot} value={slot}>{slot}</SelectItem>))}</SelectContent>
                                                    </Select>
                                                ) : <p className="font-medium text-white">{viewingPlan.start_time.slice(0, 5)}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Finance Column */}
                                    <div className="bg-zinc-900/40 p-5 rounded-xl border border-zinc-800 space-y-4">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-800/50">
                                            <Banknote className="h-4 w-4 text-emerald-400" />
                                            <h3 className="font-semibold text-zinc-200">Finanzas</h3>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500 uppercase tracking-widest">Precio por Sesión</Label>
                                                {isEditingPlan ? (
                                                    <Input type="number" value={editForm.price} onChange={(e) => setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) }))} className="bg-zinc-900 border-zinc-700 h-9 focus:ring-blue-500/20" />
                                                ) : <p className="font-medium text-2xl text-white">${viewingPlan.price}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs text-zinc-500 uppercase tracking-widest">Modalidad</Label>
                                                {isEditingPlan ? (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Switch checked={editForm.paymentAdvance} onCheckedChange={(c) => setEditForm(prev => ({ ...prev, paymentAdvance: c }))} className="data-[state=checked]:bg-blue-600" />
                                                        <span className="text-sm">{editForm.paymentAdvance ? 'Pago Adelantado' : 'Pago Manual'}</span>
                                                    </div>
                                                ) : (
                                                    viewingPlan.payment_advance
                                                        ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Pago Adelantado</Badge>
                                                        : <Badge variant="secondary">Pago en Club (Manual)</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Card (Smart Debt Trigger) */}
                                {!isEditingPlan && (
                                    <div className={`relative group overflow-hidden rounded-xl border p-1 transition-all ${(viewingPlan.pending_debt || 0) > 0
                                        ? "border-red-500/30 bg-gradient-to-r from-red-950/30 to-zinc-900/50"
                                        : "border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 to-zinc-900/50 opacity-80"
                                        }`}>
                                        <div className={`absolute inset-0 ${(viewingPlan.pending_debt || 0) > 0
                                            ? "bg-red-500/5 group-hover:bg-red-500/10"
                                            : "bg-emerald-500/5"
                                            } transition-colors`} />

                                        <button
                                            onClick={() => handleInitiateSettlement()}
                                            disabled={(viewingPlan.pending_debt || 0) <= 0}
                                            className="relative flex items-center justify-between w-full p-4 cursor-pointer disabled:cursor-default"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${(viewingPlan.pending_debt || 0) > 0
                                                    ? "bg-red-500/20 text-red-400 border-red-500/30"
                                                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                    }`}>
                                                    <Banknote className="h-5 w-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h4 className={`font-bold ${(viewingPlan.pending_debt || 0) > 0 ? "text-red-100" : "text-emerald-100"
                                                        }`}>
                                                        {(viewingPlan.pending_debt || 0) > 0
                                                            ? `Gestionar Pagos Pendientes ($${viewingPlan.pending_debt})`
                                                            : "Pagos al día"
                                                        }
                                                    </h4>
                                                    <p className={`text-xs ${(viewingPlan.pending_debt || 0) > 0 ? "text-red-400/70" : "text-emerald-400/70"
                                                        }`}>
                                                        {(viewingPlan.pending_debt || 0) > 0
                                                            ? "Clic para seleccionar reservas y pagar"
                                                            : "No hay deuda pendiente"
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            {(viewingPlan.pending_debt || 0) > 0 ? (
                                                <div className="bg-red-500/20 p-2 rounded-full animate-pulse">
                                                    <AlertTriangle className="h-5 w-5 text-red-400" />
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-500/20 p-2 rounded-full">
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="bg-zinc-950 p-6 pt-2 flex flex-col gap-4 mt-auto">
                                {isEditingPlan ? (
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsEditingPlan(false)}
                                            className="flex-1 border-zinc-700 text-zinc-300 h-11"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleSaveChanges}
                                            disabled={isSaving}
                                            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-11 shadow-lg font-semibold"
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Guardar Cambios"}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setViewingPlan(null)}
                                            className="flex-1 text-zinc-400 hover:text-white h-11"
                                        >
                                            Cerrar
                                        </Button>
                                        <Button
                                            onClick={() => setIsEditingPlan(true)}
                                            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-11 shadow-lg font-semibold"
                                        >
                                            <Pencil className="h-4 w-4 mr-2" /> Editar Plan
                                        </Button>
                                    </div>
                                )}

                                {isOwner && !isEditingPlan && (
                                    <button
                                        onClick={() => promptDeactivatePlan(viewingPlan.id)}
                                        className="text-xs text-red-500/70 hover:text-red-400 text-center hover:underline transition-all"
                                    >
                                        Cancelar Plan Definitivamente
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        // --- SMART DEBT SELECTOR VIEW ---
                        <div className="flex flex-col h-full bg-zinc-950">
                            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Banknote className="h-5 w-5 text-emerald-400" />
                                        Liquidar Deuda
                                    </h2>
                                    <p className="text-sm text-zinc-400">Selecciona las reservas a pagar ahora.</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Seleccionado</p>
                                    <p className="text-2xl font-bold text-emerald-400">
                                        ${pendingList.filter(b => selectedDebtIds.includes(b.id)).reduce((sum, b) => sum + (Number(b.price) || 0), 0)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {pendingList.length === 0 ? (
                                    <div className="text-center py-10 text-zinc-500">
                                        No se encontraron deudas pendientes.
                                    </div>
                                ) : pendingList.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className={`flex items-center gap-4 p-3 rounded-lg border transition-all ${selectedDebtIds.includes(booking.id)
                                            ? "bg-emerald-950/20 border-emerald-500/30"
                                            : "bg-zinc-900/40 border-zinc-800 opacity-60"
                                            }`}
                                    >
                                        <Checkbox
                                            checked={selectedDebtIds.includes(booking.id)}
                                            onCheckedChange={(c) => {
                                                if (c) setSelectedDebtIds(prev => [...prev, booking.id])
                                                else setSelectedDebtIds(prev => prev.filter(id => id !== booking.id))
                                            }}
                                            className="data-[state=checked]:bg-emerald-500 border-zinc-600"
                                        />
                                        <div className="flex-1 grid grid-cols-2 gap-2">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-zinc-200">
                                                    {format(parseISO(booking.start_time), "EEEE d MMM", { locale: es })}
                                                </span>
                                                <span className="text-xs text-zinc-500">
                                                    {format(parseISO(booking.start_time), "HH:mm")} • {booking.court?.name || 'Cancha'}
                                                </span>
                                            </div>
                                            <div className="text-right font-mono text-zinc-300">
                                                ${booking.price}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border-t border-zinc-800 flex gap-3 bg-zinc-900/30 shrink-0">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowDebtSelector(false)}
                                    className="flex-1 text-zinc-400 hover:text-white"
                                >
                                    Volver
                                </Button>
                                <Button
                                    onClick={handleExecuteSettlement}
                                    disabled={selectedDebtIds.length === 0 || isSaving}
                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : "Confirmar Pago"}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog >

            {/* Confirmation Dialog */}
            < Dialog open={!!deletingPlanId
            } onOpenChange={(open) => !open && setDeletingPlanId(null)}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-500">
                            <AlertTriangle className="h-5 w-5" /> Cancelar Plan Recurrente
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400 pt-2">
                            ¿Estás seguro de que deseas cancelar este plan?
                            <br /><br />
                            Esta acción <strong>eliminará todas las reservas futuras</strong> asociadas y desactivará el contrato permanentemente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeletingPlanId(null)}
                            className="bg-transparent border-zinc-700 hover:bg-zinc-900 text-white"
                        >
                            Mantener Plan
                        </Button>
                        <Button
                            onClick={executeDeactivation}
                            disabled={isSaving}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sí, Cancelar Plan"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >
        </div >
    )
}

