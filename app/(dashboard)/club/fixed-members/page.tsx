"use client"

import { useEffect, useState } from "react"
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
interface RecurringPlan {
    id: string
    user: { full_name: string; email: string; phone: string } | null
    court_id: string
    day_of_week: number
    start_time: string
    duration_mins: number
    start_date: string
    end_date: string
    price: number
    active: boolean
    payment_advance?: boolean
    remaining_sessions?: number
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

    // Management Modal State
    const [viewingPlan, setViewingPlan] = useState<RecurringPlan | null>(null)
    const [isEditingPlan, setIsEditingPlan] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null)
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
            setEditForm({
                courtId: viewingPlan.court_id,
                dayOfWeek: String(viewingPlan.day_of_week),
                startTime: viewingPlan.start_time.slice(0, 5),
                price: viewingPlan.price,
                paymentAdvance: viewingPlan.payment_advance || false
            })
            setIsEditingPlan(false)
        }
    }, [viewingPlan])

    // Auto-calculate Start Date when Day changes (Smart Snap)
    useEffect(() => {
        const targetDay = parseInt(formData.dayOfWeek)
        // Find next occurrence
        let current = new Date()
        // If today is the target day, we can start today, or next week? Usually today is fine if hour > now.
        // But simply logic: Keep iterating until getDay() === targetDay
        while (current.getDay() !== targetDay) {
            current.setDate(current.getDate() + 1)
        }

        // Update start date to this calculated snap
        // Only if it's different to avoid loops, though strict equality check handles it.
        // Also we only want to do this if the user hasn't manually picked a far future date?
        // Let's assume if he changes Day of Week, he expects the date to realign.
        setFormData(prev => ({
            ...prev,
            startDate: format(current, 'yyyy-MM-dd')
        }))
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
            // 0. VAMPIRE HUNTER: Auto-deactivate expired plans
            const todayISO = new Date().toISOString().split('T')[0]
            const { error: vampireError } = await supabase
                .from('recurring_plans')
                .update({ active: false })
                .eq('organization_id', orgId)
                .eq('active', true)
                .lt('end_date', todayISO)

            if (vampireError) console.error("Vampire Hunter failed:", vampireError)

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
        const { data: plansData, error: plansError } = await supabase
            .from('recurring_plans')
            .select(`*, user:users(full_name, email, phone), member:club_members(full_name, email, phone)`)
            .eq('organization_id', orgId)
            .eq('active', true)
            .order('created_at', { ascending: false })

        if (!plansError && plansData) {
            const now = new Date().toISOString()
            const planIds = plansData.map((p: any) => p.id)

            let counts: Record<string, number> = {}

            if (planIds.length > 0) {
                // Count FUTURE bookings (Real Remaining)
                const { data: futureCounts } = await supabase
                    .from('bookings')
                    .select('recurring_plan_id')
                    .in('recurring_plan_id', planIds)
                    .gte('start_time', now)
                    .neq('payment_status', 'canceled') // Don't count canceled

                futureCounts?.forEach((b: any) => {
                    if (b.recurring_plan_id) counts[b.recurring_plan_id] = (counts[b.recurring_plan_id] || 0) + 1
                })
            }

            const enriched = plansData.map((p: any) => ({ ...p, remaining_sessions: counts[p.id] || 0 }))
            setPlans(enriched)
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

            // 2. Update Plan
            const { error: planErr } = await supabase
                .from('recurring_plans')
                .update(updates)
                .eq('id', viewingPlan.id)

            if (planErr) throw planErr

            // 3. Sync Future Reservas (Accuracy Update)
            if (confirm("¿Deseas aplicar estos cambios (Cancha y Precio) a todas las reservas futuras PENDIENTES de este plan?")) {
                const now = new Date().toISOString()
                const { error: bookingErr } = await supabase
                    .from('bookings')
                    .update({
                        court_id: updates.court_id,
                        price: updates.price // Sync core price column
                    })
                    .eq('recurring_plan_id', viewingPlan.id)
                    .gte('start_time', now)
                    .eq('payment_status', 'pending')

                if (bookingErr) throw bookingErr
                toast({ title: "Plan y Reservas Actualizados", description: "Se han actualizado las reservas futuras." })
            } else {
                toast({ title: "Plan Actualizado", description: "Los cambios aplicarán solo a nuevas generaciones." })
            }

            setViewingPlan({ ...viewingPlan, ...updates, start_time: editForm.startTime + ':00' } as any)
            setIsEditingPlan(false)
            reloadPlans()

        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const handlePayMonthBatch = async () => {
        if (!viewingPlan) return

        if (!confirm(`¿Liquidar facturación de ${format(new Date(), 'MMMM vvvv', { locale: es })} para este socio?`)) return

        setIsSaving(true)
        try {
            const { data, error } = await supabase.rpc('pay_recurring_month_batch', {
                p_plan_id: viewingPlan.id,
                p_month_date: new Date().toISOString()
            })

            if (error) throw error

            toast({
                title: "Facturación Liquidada",
                description: `Se han cobrado ${data} reservas del mes actual.`,
                className: "bg-emerald-600 border-none text-white font-bold shadow-xl"
            })
            reloadPlans()
        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

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
            // 1. Generate Slots
            const slots: { start: string, end: string, date: string }[] = []
            let current = parseISO(formData.startDate)
            const end = parseISO(formData.endDate)
            const dayTarget = parseInt(formData.dayOfWeek)
            const [hour, minute] = formData.startTime.split(':').map(Number)

            // Normalize start date
            while (current.getDay() !== dayTarget) {
                current.setDate(current.getDate() + 1)
            }
            // If we went past end date (unlikely given start date is usually today)

            // Loop weeks
            while (isBefore(current, end) || current.getTime() === end.getTime()) {
                const slotStart = new Date(current)
                slotStart.setHours(hour, minute, 0, 0)
                const slotEnd = addMinutes(slotStart, 90) // 90 min fixed

                slots.push({
                    start: slotStart.toISOString(),
                    end: slotEnd.toISOString(),
                    date: format(current, 'yyyy-MM-dd')
                })

                current = addWeeks(current, 1)
            }

            if (slots.length === 0) {
                throw new Error(`No hay sesiones los ${DAYS[dayTarget]} entre las fechas seleccionadas.`)
            }

            // 2. Scan Conflicts
            const rangeStart = slots[0].start
            const rangeEnd = slots[slots.length - 1].end

            const { data: conflicts } = await supabase
                .from('bookings')
                .select('start_time, end_time')
                .eq('court_id', formData.courtId)
                .gte('end_time', rangeStart)
                .lte('start_time', rangeEnd)

            const hasConflict = slots.some(slot => {
                const sStart = new Date(slot.start).getTime()
                const sEnd = new Date(slot.end).getTime()
                return conflicts?.some((c: any) => {
                    const cStart = new Date(c.start_time).getTime()
                    const cEnd = new Date(c.end_time).getTime()
                    return (sStart < cEnd && sEnd > cStart)
                })
            })

            if (hasConflict) {
                toast({ title: "Conflicto de Horario", description: "Una o más sesiones coinciden con reservas existentes.", variant: "destructive" })
                setCreating(false)
                return
            }

            // 3. Create Plan
            const { data: plan, error: planError } = await supabase
                .from('recurring_plans')
                .insert({
                    organization_id: orgId,
                    user_id: formData.userId || null,
                    member_id: formData.memberId || null,
                    court_id: formData.courtId,
                    day_of_week: parseInt(formData.dayOfWeek),
                    start_time: formData.startTime + ':00',
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    total_price: parseFloat(formData.price),
                    active: true,
                    payment_advance: formData.advancePayment
                })
                .select()
                .single()

            if (planError) throw planError

            // 4. Batch Insert
            const selectedUser = orgUsers.find(u => u.id === formData.userId)

            const bookingsToInsert = slots.map(slot => ({
                entity_id: orgId,
                court_id: formData.courtId,
                user_id: formData.userId || null,
                start_time: slot.start,
                end_time: slot.end,
                title: selectedUser?.full_name || selectedMember?.full_name || 'Reserva Fija',
                payment_status: formData.advancePayment ? 'paid' : 'pending',
                recurring_plan_id: plan.id,
            }))

            const { error: batchError } = await supabase.from('bookings').insert(bookingsToInsert)
            if (batchError) throw batchError

            toast({ title: "Plan Creado", description: `Se han generado ${slots.length} reservas.` })
            setIsCreateModalOpen(false)
            reloadPlans()

        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: error.message, variant: "destructive" })
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
                                            <Label>Precio Total (Opcional)</Label>
                                            <Input type="number" className="bg-zinc-900 border-zinc-700"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                            />
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
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center">
                                            <Badge variant="outline" className={
                                                (plan.remaining_sessions || 0) < 4
                                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                            }>
                                                {plan.remaining_sessions} pendientes
                                            </Badge>
                                            <span className="text-[10px] text-zinc-500 mt-1">Por jugar</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem className="cursor-pointer" onClick={() => setViewingPlan(plan)}>
                                                    <FileText className="mr-2 h-4 w-4" /> Ver Contrato
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-400 focus:text-red-400 cursor-pointer"
                                                    onSelect={(e) => {
                                                        e.preventDefault() // Prevent auto-close to handle state update smoothly
                                                        promptDeactivatePlan(plan.id)
                                                    }}
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
            <Dialog open={!!viewingPlan} onOpenChange={(open) => !open && setViewingPlan(null)}>
                <DialogContent className="bg-black/95 border-zinc-800 text-white sm:max-w-2xl p-0 overflow-hidden shadow-2xl">
                    {/* Header */}
                    {viewingPlan && (
                        <>
                            <div className="bg-zinc-900/60 p-6 border-b border-zinc-800 flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg border-2 border-zinc-900">
                                    <span className="text-xl font-bold">{viewingPlan.user?.full_name?.[0] || 'U'}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-bold text-white">{viewingPlan.user?.full_name || 'Sin Nombre'}</h2>
                                        <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30">
                                            Socio Fijo Activo
                                        </Badge>
                                    </div>
                                    <p className="text-zinc-400 text-sm flex items-center gap-2">
                                        <Umbrella className="h-3 w-3" /> Contrato ID: {viewingPlan.id.slice(0, 8)}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
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

                                {/* Action Card (Payment) - Visible ONLY if NOT editing */}
                                {!isEditingPlan && (
                                    <div className="relative group overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 to-zinc-900/50 p-1">
                                        <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                                        <button
                                            onClick={handlePayMonthBatch}
                                            className="relative flex items-center justify-between w-full p-4 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                                                    <Banknote className="h-5 w-5" />
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-bold text-emerald-100">Liquidar Facturación de {format(new Date(), 'MMMM', { locale: es })}</h4>
                                                    <p className="text-xs text-emerald-400/70">Marcar todas las reservas de este mes como PAGADAS</p>
                                                </div>
                                            </div>
                                            <div className="bg-emerald-500/20 p-2 rounded-full">
                                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="bg-zinc-950 p-6 pt-2 flex flex-col gap-4">
                                {isEditingPlan ? (
                                    <div className="flex gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsEditingPlan(false)}
                                            className="flex-1 border-zinc-700 text-zinc-300 h-11"
                                        >
                                            Cancelar Edición
                                        </Button>
                                        <Button
                                            onClick={handleSaveChanges}
                                            disabled={isSaving}
                                            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-11 shadow-lg shadow-blue-900/20 font-semibold"
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
                                            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white h-11 shadow-lg shadow-blue-900/20 font-semibold"
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
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={!!deletingPlanId} onOpenChange={(open) => !open && setDeletingPlanId(null)}>
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
            </Dialog>
        </div>
    )
}

