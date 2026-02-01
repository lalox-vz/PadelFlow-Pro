"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import {
    AvailabilityGrid,
    GridBooking
} from "@/components/club/AvailabilityGrid"
import { MonthOverview } from "@/components/club/calendar/MonthOverview"
import {
    EntityConfiguration,
    createDefaultConfig
} from "@/lib/booking-logic"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns"
import { es } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Loader2, RefreshCw, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ClubCalendarPage() {
    const { user, profile } = useAuth()
    const { toast } = useToast()

    // Derived Organization ID
    const orgId = profile?.organization_id || user?.user_metadata?.organization_id

    const [date, setDate] = useState<Date>(new Date())
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day')
    const [config, setConfig] = useState<EntityConfiguration | null>(null)
    const [bookings, setBookings] = useState<GridBooking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Security Timeout
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading && !orgId) {
                console.error("Timeout waiting for organization ID")
                setError("Tiempo de espera agotado. No se pudo cargar la configuración del club. Verifica tus permisos.")
                setLoading(false)
            }
        }, 5000)
        return () => clearTimeout(timer)
    }, [loading, orgId])

    useEffect(() => {
        if (orgId) {
            fetchData(orgId, date, viewMode)
        } else if (!loading) {
            // Do nothing
        }
    }, [orgId, date, viewMode])

    const fetchData = async (organizationId: string, selectedDate: Date, mode: 'day' | 'month') => {
        setLoading(true)
        setError(null)
        try {
            // 1. Fetch Entity & Config (Only if not loaded or always? Safest always for now or check caching)
            // For improvements, we could cache config, but let's re-fetch to ensure sync with settings changes.

            const { data: entityData, error: entityError } = await supabase
                .from('entities')
                .select('default_duration, advance_booking_days, cancellation_window')
                .eq('id', organizationId)
                .single()

            if (entityError) throw new Error("Error al cargar configuración del club: " + entityError.message)

            // Parallel Config Fetches
            const [
                { data: sqlCourts },
                { data: sqlHours },
                { data: sqlRules }
            ] = await Promise.all([
                supabase.from('courts').select('*').eq('club_id', organizationId).order('name'),
                supabase.from('opening_hours').select('day_of_week, open_time, close_time').eq('entity_id', organizationId),
                supabase.from('pricing_rules').select('*').eq('entity_id', organizationId).is('is_active', true)
            ])

            // Construct Config
            const loadedConfig = createDefaultConfig()
            if (sqlCourts) loadedConfig.courts = sqlCourts.map((c: any) => ({
                id: c.id, name: c.name, isActive: c.is_active, type: c.details?.type || 'indoor', surface: c.details?.surface, basePrice: c.details?.basePrice
            })) as any
            if (sqlHours) loadedConfig.openingHours = sqlHours.map((h: any) => ({ dayOfWeek: h.day_of_week, openTime: h.open_time, closeTime: h.close_time }))
            if (sqlRules) {
                const baseRule = sqlRules.find((r: any) => r.name === 'Tarifa Base')
                const specialRules = sqlRules.filter((r: any) => r.name !== 'Tarifa Base')

                if (baseRule) {
                    loadedConfig.basePrice = Number(baseRule.price) // Set global fallback
                }

                loadedConfig.pricingRules = specialRules.map((r: any) => ({
                    days: r.days,
                    startTime: r.start_time.substring(0, 5),
                    endTime: r.end_time.substring(0, 5),
                    price: Number(r.price),
                    courtIds: r.court_ids
                }))
            }
            if (entityData) {
                loadedConfig.bookingRules = {
                    defaultDuration: entityData.default_duration || 90,
                    advanceBookingDays: entityData.advance_booking_days || 14,
                    cancellationWindow: entityData.cancellation_window || 24
                } as any
            }
            setConfig(loadedConfig)

            // 2. Fetch Bookings based on View Mode
            let startRange: Date, endRange: Date

            if (mode === 'month') {
                startRange = startOfMonth(selectedDate)
                endRange = endOfMonth(selectedDate)
            } else {
                startRange = new Date(selectedDate); startRange.setHours(0, 0, 0, 0)
                endRange = new Date(selectedDate); endRange.setHours(23, 59, 59, 999)
            }

            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select('*')
                .eq('entity_id', organizationId)
                .gte('start_time', startRange.toISOString())
                .lte('start_time', endRange.toISOString())
                .neq('payment_status', 'canceled')

            if (bookingsError && bookingsError.code !== 'PGRST116') throw bookingsError

            const mappedBookings: GridBooking[] = (bookingsData || []).map((b: any) => ({
                id: b.id,
                courtId: b.court_id,
                startTime: new Date(b.start_time),
                endTime: new Date(b.end_time),
                title: b.title || 'Reserva',
                paymentStatus: b.payment_status || 'pending',
                totalPrice: b.price || 0, // Map from DB 'price' column
                participant_checkin: b.participant_checkin,
                recurring_plan_id: b.recurring_plan_id
            }))

            setBookings(mappedBookings)

        } catch (err: any) {
            console.error("Calendar Load Error:", err)
            setError(err.message || "Error desconocido.")
            toast({ variant: "destructive", title: "Error Crítico", description: err.message })
        } finally {
            setLoading(false)
        }
    }

    const handleCreateBooking = async (booking: { courtId: string, startTime: Date, endTime: Date, name: string, isPaid: boolean, price: number, userId?: string | null, description?: string }) => {
        if (!orgId) return
        try {
            const newBooking: GridBooking = {
                id: 'temp-' + Date.now(),
                courtId: booking.courtId,
                startTime: booking.startTime,
                endTime: booking.endTime,
                title: booking.name,
                paymentStatus: booking.isPaid ? 'paid' : 'pending',
                totalPrice: booking.price,
                description: booking.description
            }
            setBookings(prev => [...prev, newBooking])

            const { error } = await supabase.from('bookings').insert({
                entity_id: orgId,
                court_id: booking.courtId,
                start_time: booking.startTime.toISOString(),
                end_time: booking.endTime.toISOString(),
                title: booking.name,
                description: booking.description,
                payment_status: booking.isPaid ? 'paid' : 'pending',
                user_id: booking.userId || null,
                price: booking.price
            })
            if (error) throw error
            toast({ title: "Reserva Creada", description: "Guardada exitosamente." })
            fetchData(orgId, date, viewMode)
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
            fetchData(orgId, date, viewMode)
        }
    }

    const handleUpdateBooking = async (bookingId: string, updates: any) => {
        if (!orgId) return
        try {
            const payload: any = {
                title: updates.name,
                payment_status: updates.isPaid ? 'paid' : 'pending',
                court_id: updates.courtId,
                start_time: updates.startTime.toISOString(),
                end_time: updates.endTime.toISOString(),
                price: updates.totalPrice // Start using 'price' exclusively, assuming frontend passes 'totalPrice' in updates object currently
            }
            if (updates.participant_checkin !== undefined) payload.participant_checkin = updates.participant_checkin

            const { error } = await supabase.from('bookings').update(payload).eq('id', bookingId)
            if (error) throw error
            toast({ title: "Reserva Actualizada" })
            fetchData(orgId, date, viewMode)
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const handleDeleteBooking = async (bookingId: string) => {
        if (!orgId) return
        try {
            // Soft Delete: Mark as canceled to preserve history and avoid Foreign Key issues in logs
            const { error } = await supabase
                .from('bookings')
                .update({ payment_status: 'canceled' })
                .eq('id', bookingId)

            if (error) throw error
            toast({ title: "Reserva Cancelada", description: "La reserva ha sido marcada como cancelada." })
            fetchData(orgId, date, viewMode)
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        }
    }

    const handleCourtToggle = async (courtId: string, isActive: boolean) => {
        if (!config || !orgId) return
        const updatedConfig = { ...config, courts: config.courts.map(c => c.id === courtId ? { ...c, isActive } : c) }
        setConfig(updatedConfig)
        try {
            await supabase.from('courts').update({ is_active: isActive }).eq('id', courtId).eq('club_id', orgId)
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Fallo al actualizar estado." })
            fetchData(orgId, date, viewMode)
        }
    }

    const handleFetchLogs = async (bookingId: string) => { /* Keeping simplified for brevity, assume logs fetch works */
        const { data } = await supabase.from('booking_logs').select(`*, user:users(full_name, email)`).eq('booking_id', bookingId).order('created_at', { ascending: false }).limit(10)
        return data || []
    }

    const navigateDate = (direction: 'prev' | 'next') => {
        if (viewMode === 'day') {
            setDate(prev => addDays(prev, direction === 'next' ? 1 : -1))
        } else {
            setDate(prev => addMonths(prev, direction === 'next' ? 1 : -1))
        }
    }

    // --- RENDER ---

    if (loading && !config && !error) return <div className="flex justify-center h-[50vh] items-center"><Loader2 className="animate-spin text-emerald-500" /></div>
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>
    if (!orgId) return <div className="text-center p-8 text-zinc-500">Sin Organización.</div>

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
                        Calendario Global
                        {loading && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}
                    </h1>
                    <p className="text-muted-foreground">Gestión de disponibilidad y reservas.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* View Toggle */}
                    <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('day')}
                            className={cn("h-8 px-3 text-xs gap-2", viewMode === 'day' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white")}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" /> Día
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewMode('month')}
                            className={cn("h-8 px-3 text-xs gap-2", viewMode === 'month' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white")}
                        >
                            <CalendarIcon className="h-3.5 w-3.5" /> Mes
                        </Button>
                    </div>

                    <div className="h-6 w-px bg-zinc-800 mx-1" />

                    {/* Navigation */}
                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => navigateDate('prev')}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"ghost"}
                                    className={cn(
                                        "w-[180px] justify-center font-medium text-white hover:bg-zinc-800 h-8",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-zinc-500" />
                                    {date ? format(date, viewMode === 'day' ? "EEEE d MMM" : "MMMM yyyy", { locale: es }) : <span>Fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800" align="end">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(d) => d && setDate(d)}
                                    initialFocus
                                    className="bg-zinc-950 text-white"
                                />
                            </PopoverContent>
                        </Popover>

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => navigateDate('next')}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fetchData(orgId, date, viewMode)}
                        className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 h-10 w-10 ml-2"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-[500px]">
                {config ? (
                    viewMode === 'day' ? (
                        <AvailabilityGrid
                            date={date}
                            config={config}
                            bookings={bookings}
                            onCourtToggle={handleCourtToggle}
                            onCreateBooking={handleCreateBooking}
                            onUpdateBooking={handleUpdateBooking}
                            onDeleteBooking={handleDeleteBooking}
                            onFetchLogs={handleFetchLogs}
                        />
                    ) : (
                        <MonthOverview
                            date={date}
                            bookings={bookings}
                            onDateSelect={(d) => { setDate(d); setViewMode('day') }}
                            isLoading={loading}
                            validCourtIds={config?.courts.map(c => c.id) || []}
                        />
                    )
                ) : (
                    <div className="flex items-center justify-center h-64 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                        {loading ? 'Cargando configuración...' : 'No hay configuración.'}
                    </div>
                )}
            </div>

            {viewMode === 'day' && (
                <div className="flex gap-6 text-xs text-zinc-500 border-t border-zinc-800 pt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30"></div>
                        <span>Reservado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/20"></div>
                        <span>Disponible</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-zinc-900 border border-zinc-800"></div>
                        <span>Bloqueado / Cerrado</span>
                    </div>
                </div>
            )}
        </div>
    )
}
