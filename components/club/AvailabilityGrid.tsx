"use client"

import { useState, useMemo, useEffect } from "react"
import { format, addMinutes, isSameDay, parseISO, isWithinInterval, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
    calculatePrice,
    EntityConfiguration,
    ExistingBooking
} from "@/lib/booking-logic"
import { Switch } from "@/components/ui/switch"
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
import { Checkbox } from "@/components/ui/checkbox"
import { cn, toLocalTime } from "@/lib/utils"
import Link from "next/link"
import { Lock, Plus, User, CheckCircle2, Settings, AlertCircle, Clock, Banknote, UserCheck, Repeat, Phone } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@supabase/ssr"
import { MemberSelector } from "./MemberSelector"
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

// Extended Booking Interface for UI display
export interface GridBooking extends ExistingBooking {
    id: string
    title?: string // Name of user or reservation
    paymentStatus?: 'paid' | 'pending'
    totalPrice?: number // Price from database
    participant_checkin?: boolean
    recurring_plan_id?: string | null
    description?: string | null
    metadata?: Record<string, any> | null
}

interface AvailabilityGridProps {
    date: Date
    config: EntityConfiguration
    bookings: GridBooking[]
    onCourtToggle?: (courtId: string, isActive: boolean) => void
    onCreateBooking?: (booking: {
        courtId: string,
        startTime: Date,
        endTime: Date,
        name: string,
        isPaid: boolean,
        price: number,
        userId?: string | null
        description?: string,
        email?: string,
        phone?: string
    }) => Promise<void>
    onUpdateBooking?: (bookingId: string, updates: {
        name: string,
        isPaid: boolean,
        startTime: Date,
        endTime: Date,
        courtId: string,
        totalPrice: number,
        participant_checkin?: boolean
    }) => Promise<void>
    onDeleteBooking?: (bookingId: string) => Promise<void>
    onFetchLogs?: (bookingId: string) => Promise<any[]>
}

export function AvailabilityGrid({
    date,
    config,
    bookings,
    onCourtToggle,
    onCreateBooking,
    onUpdateBooking,
    onDeleteBooking,
    onFetchLogs
}: AvailabilityGridProps) {
    // New booking modal state
    const [selectedSlot, setSelectedSlot] = useState<{
        courtId: string,
        courtName: string,
        startTime: Date,
        endTime: Date,
        price: number
    } | null>(null)

    // Edit booking modal state
    const [editingBooking, setEditingBooking] = useState<GridBooking | null>(null)

    // Debug: Check metadata flow
    useEffect(() => {
        if (editingBooking) {
            console.log('Booking Metadata:', editingBooking.metadata)
        }
    }, [editingBooking])

    // DEBUG: Inspect configuration
    console.log("DATOS RECIBIDOS EN GRID:", config)


    // Modal Form State
    const [bookingForm, setBookingForm] = useState({
        name: '',
        userId: null as string | null,
        phone: '',
        email: '',
        isPaid: false,
        startTime: new Date(),
        endTime: new Date(),
        courtId: '',
        originalPrice: 0,
        newPrice: 0
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [conflictError, setConflictError] = useState<string | null>(null)
    const [priceDifference, setPriceDifference] = useState<number>(0) // Track price change from database value
    const [activityLogs, setActivityLogs] = useState<any[]>([]) // Booking history

    // Generate Time Slots for Columns based on Schedule (SQL Relational)
    const timeSlots = useMemo(() => {
        const dayOfWeek = date.getDay() // 0=Sunday

        // Find opening hours for this day
        const oh = config.openingHours?.find(h => h.dayOfWeek === dayOfWeek)

        if (!oh) {
            console.log('DEBUG: No opening hours for day index', dayOfWeek)
            return []
        }

        const slots: Date[] = []
        // Handle HH:mm or HH:mm:ss
        const openStr = oh.openTime.substring(0, 5)
        const closeStr = oh.closeTime.substring(0, 5)

        const [openH, openM] = openStr.split(':').map(Number)
        const [closeH, closeM] = closeStr.split(':').map(Number)

        let current = new Date(date)
        current.setHours(openH, openM, 0, 0)

        const end = new Date(date)
        end.setHours(closeH, closeM, 0, 0)

        const duration = config.bookingRules?.defaultDuration || 90

        while (current.getTime() + (duration * 60000) <= end.getTime()) {
            slots.push(new Date(current))
            current = addMinutes(current, duration)
        }

        return slots
    }, [date, config])

    // Helper to find a booking for a specific cell
    const findBooking = (courtId: string, slotStart: Date, slotEnd: Date) => {
        return bookings.find(b => {
            // Use toLocalTime to ensure precise comparison within our target timezone
            const bStart = toLocalTime(b.startTime)
            const bEnd = toLocalTime(b.endTime)

            // Overlap: (StartA < EndB) and (EndA > StartB)
            return slotStart < bEnd && slotEnd > bStart && b.courtId === courtId
        })
    }

    const handleCellClick = (courtId: string, courtName: string, startTime: Date, price: number) => {
        const duration = config.bookingRules?.defaultDuration || 90
        const endTime = addMinutes(startTime, duration)

        setSelectedSlot({
            courtId,
            courtName,
            startTime,
            endTime,
            price
        })
        setBookingForm({
            name: '',
            userId: null,
            phone: '',
            email: '',
            isPaid: false,
            startTime: new Date(),
            endTime: new Date(),
            courtId: '',
            originalPrice: 0,
            newPrice: 0
        })
    }

    const handleBookingClick = async (booking: GridBooking) => {
        console.log('💰 Booking data:', {
            totalPrice: booking.totalPrice,
            startTime: booking.startTime,
            courtId: booking.courtId
        })

        // Use database price as base, or calculate if not available
        const dbPrice = Number(booking.totalPrice) || calculatePrice(new Date(booking.startTime), config) || 0
        const currentPrice = calculatePrice(new Date(booking.startTime), config) || 0

        console.log('💰 Prices calculated:', {
            dbPrice,
            currentPrice,
            isValidDbPrice: !isNaN(dbPrice),
            isValidCurrentPrice: !isNaN(currentPrice)
        })

        setEditingBooking(booking)
        setBookingForm({
            name: booking.title || '',
            userId: null, // Edit doesn't support changing user link strictly yet, or we'd need to fetch it
            phone: '',
            email: '',
            isPaid: booking.paymentStatus === 'paid',
            startTime: new Date(booking.startTime),
            endTime: new Date(booking.endTime),
            courtId: booking.courtId,
            originalPrice: isNaN(dbPrice) ? 0 : dbPrice, // Ensure valid number
            // CRITICAL FIX: If it's a recurring plan (contract), preserve the DB price. Do NOT recalculate.
            // Also good practice to preserve DB price for manual edits unless time changes.
            newPrice: (booking.recurring_plan_id || !isNaN(dbPrice)) ? dbPrice : (isNaN(currentPrice) ? 0 : currentPrice)
        })
        setPriceDifference(0) // No difference initially
        setConflictError(null)

        // Fetch activity logs
        if (onFetchLogs) {
            try {
                console.log('📋 Fetching logs for booking:', booking.id)
                const logs = await onFetchLogs(booking.id)
                console.log('📋 Logs fetched:', logs)
                setActivityLogs(logs || [])
            } catch (error) {
                console.error('❌ Error fetching logs:', error)
                setActivityLogs([])
            }
        } else {
            console.warn('⚠️ onFetchLogs prop not provided')
            setActivityLogs([])
        }
    }

    const handleTimeChange = (newStartTime: Date) => {
        const duration = config.bookingRules?.defaultDuration || 90
        const newEndTime = addMinutes(newStartTime, duration)
        setBookingForm({
            ...bookingForm,
            startTime: newStartTime,
            endTime: newEndTime
        })
        checkConflict(bookingForm.courtId, newStartTime, newEndTime)
    }

    const handleCourtChange = (newCourtId: string) => {
        setBookingForm({ ...bookingForm, courtId: newCourtId })
        checkConflict(newCourtId, bookingForm.startTime, bookingForm.endTime)
    }

    const checkConflict = (courtId: string, startTime: Date, endTime: Date) => {
        const conflict = bookings.find(b => {
            if (b.id === editingBooking?.id) return false // Ignore self
            if (b.courtId !== courtId) return false
            const bStart = new Date(b.startTime)
            const bEnd = new Date(b.endTime)
            return startTime < bEnd && endTime > bStart
        })

        if (conflict) {
            setConflictError('Esta cancha ya está ocupada en este horario. Por favor, selecciona otro bloque o cancha.')
        } else {
            setConflictError(null)
        }
    }

    const handleBlockSelection = (blockValue: string) => {
        // Parse "HH:MM" from blockValue
        const [hours, minutes] = blockValue.split(':').map(Number)
        const newStart = new Date(date)
        newStart.setHours(hours, minutes, 0, 0)

        const duration = config.bookingRules?.defaultDuration || 90
        const newEnd = addMinutes(newStart, duration)

        // Calculate new price for the selected time
        const newPrice = calculatePrice(newStart, config) || 0

        setBookingForm({
            ...bookingForm,
            startTime: newStart,
            endTime: newEnd,
            newPrice: isNaN(newPrice) ? 0 : newPrice
        })

        // Calculate difference from database price (ensure both are valid numbers)
        const validOriginal = isNaN(bookingForm.originalPrice) ? 0 : bookingForm.originalPrice
        const validNew = isNaN(newPrice) ? 0 : newPrice
        setPriceDifference(validNew - validOriginal)

        checkConflict(bookingForm.courtId, newStart, newEnd)
    }

    // Generate available time blocks for the BOOKING's day (not today's date)
    const availableTimeBlocks = useMemo(() => {
        // Use the booking's date
        const bookingDate = bookingForm.startTime || date
        const dayOfWeek = bookingDate.getDay()

        const oh = config.openingHours?.find(h => h.dayOfWeek === dayOfWeek)

        if (!oh) {
            console.warn('⚠️ No opening hours for day', dayOfWeek)
            return []
        }

        console.log('✅ Schedule found (SQL):', oh)

        const blocks: { value: string; label: string }[] = []
        const openStr = oh.openTime.substring(0, 5)
        const closeStr = oh.closeTime.substring(0, 5)

        const [openH, openM] = openStr.split(':').map(Number)
        const [closeH, closeM] = closeStr.split(':').map(Number)
        const duration = config.bookingRules?.defaultDuration || 90

        let current = new Date(bookingDate)
        current.setHours(openH, openM, 0, 0)

        const end = new Date(bookingDate)
        end.setHours(closeH, closeM, 0, 0)

        while (current.getTime() + (duration * 60000) <= end.getTime()) {
            const blockEnd = addMinutes(current, duration)
            blocks.push({
                value: format(current, 'HH:mm'),
                label: `${format(current, 'HH:mm')} - ${format(blockEnd, 'HH:mm')}`
            })
            current = blockEnd
        }

        console.log('✅ Slots generated for day', dayOfWeek, ':', blocks.length, 'blocks')
        return blocks
    }, [bookingForm.startTime, config, date])

    const handleUpdateBooking = async () => {
        if (!editingBooking || !onUpdateBooking || conflictError) return

        // Check for price change
        const priceChanged = bookingForm.newPrice !== bookingForm.originalPrice
        const priceIncreased = bookingForm.newPrice > bookingForm.originalPrice

        // Show confirmation if price changed
        if (priceChanged) {
            const message = priceIncreased
                ? `El precio ha cambiado de $${bookingForm.originalPrice} a $${bookingForm.newPrice}. Se marcará el saldo como pendiente. ¿Deseas continuar?`
                : `El precio ha bajado de $${bookingForm.originalPrice} a $${bookingForm.newPrice}. ¿Deseas actualizar la reserva?`

            if (!confirm(message)) return
        }

        // Auto-adjust payment status if price increased and was paid
        let finalPaymentStatus = bookingForm.isPaid
        if (priceIncreased && bookingForm.isPaid) {
            finalPaymentStatus = false // Mark as pending if price increased
        }

        setIsSubmitting(true)
        try {
            await onUpdateBooking(editingBooking.id, {
                name: bookingForm.name,
                isPaid: finalPaymentStatus,
                startTime: bookingForm.startTime,
                endTime: bookingForm.endTime,
                courtId: bookingForm.courtId,
                totalPrice: bookingForm.newPrice
            })
            setEditingBooking(null)
            setConflictError(null)
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteBooking = async () => {
        if (!editingBooking || !onDeleteBooking) return

        if (!confirm('¿Estás seguro de que deseas cancelar esta reserva?')) return

        setIsSubmitting(true)
        try {
            await onDeleteBooking(editingBooking.id)
            setEditingBooking(null)
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const submitBooking = async () => {
        if (!selectedSlot || !onCreateBooking) return

        setIsSubmitting(true)
        try {
            console.log('📝 Creating manual booking:', {
                court: selectedSlot.courtName,
                time: format(selectedSlot.startTime, 'HH:mm'),
                client: bookingForm.name,
                userId: bookingForm.userId,
                isPaid: bookingForm.isPaid,
                price: selectedSlot.price
            })

            // Construct description with phone if provided and not registered
            const description = bookingForm.phone && !bookingForm.userId
                ? `TLF: ${bookingForm.phone}`
                : undefined

            await onCreateBooking({
                courtId: selectedSlot.courtId,
                startTime: selectedSlot.startTime,
                endTime: selectedSlot.endTime,
                name: bookingForm.name,
                isPaid: bookingForm.isPaid,
                price: selectedSlot.price,
                userId: bookingForm.userId,
                description: description,
                email: bookingForm.email,
                phone: bookingForm.phone
            } as any)
            setSelectedSlot(null) // Close modal
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Check configuration status
    const isConfigured = !!config.courts?.length && !!config.openingHours?.length
    console.log('¿Está configurado?:', isConfigured, 'Courts:', config.courts?.length, 'Hours:', config.openingHours?.length)

    if (!isConfigured) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400 text-center">
                <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                    <Settings className="h-6 w-6 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Tu club aún no está configurado</h3>
                <p className="max-w-md mb-6 text-sm text-muted-foreground">
                    Para comenzar a recibir reservas, necesitas definir tus horarios de apertura y las canchas disponibles.
                </p>
                <Button asChild variant="outline" className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400">
                    <Link href="/club/settings">
                        Ir a Ajustes del Club
                    </Link>
                </Button>
            </div>
        )
    }

    if (timeSlots.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 rounded-lg border border-zinc-800 text-zinc-400">
                <Lock className="h-12 w-12 mb-4 opacity-50" />
                <p>El club está cerrado en esta fecha.</p>
            </div>
        )
    }

    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar bg-zinc-950 rounded-xl border border-zinc-800 shadow-xl">
            <div className="min-w-[800px]">
                {/* Header Row: Time Slots */}
                <div className="flex border-b border-zinc-800">
                    {/* Corner Cell */}
                    <div className="sticky left-0 w-48 shrink-0 bg-zinc-950 p-4 border-r border-zinc-800 z-10 flex items-center font-semibold text-zinc-300">
                        Canchas / Horarios
                    </div>
                    {/* Time Columns */}
                    {timeSlots.map((slot, i) => (
                        <div key={i} className="w-32 shrink-0 p-3 text-center border-r border-zinc-800/50 text-sm font-medium text-zinc-400 bg-zinc-900/50">
                            {format(slot, 'HH:mm')}
                        </div>
                    ))}
                </div>

                {/* Court Rows */}
                {config.courts.map((court) => (
                    <div key={court.id} className="flex border-b border-zinc-800/50 group hover:bg-zinc-900/20 transition-colors">
                        {/* Row Header: Court Details & Toggle */}
                        <div className="sticky left-0 w-48 shrink-0 bg-zinc-950 p-4 border-r border-zinc-800 z-10 flex flex-col justify-center gap-2">
                            <div className="flex items-center justify-between">
                                <span className={cn(
                                    "font-bold text-sm",
                                    court.isActive ? "text-white" : "text-zinc-500 line-through"
                                )}>
                                    {court.name}
                                </span>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <Switch
                                        checked={court.isActive}
                                        onCheckedChange={(checked) => onCourtToggle && onCourtToggle(court.id, checked)}
                                        className="scale-75 data-[state=checked]:bg-emerald-500"
                                    />
                                </div>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                                {court.type}
                            </span>
                        </div>

                        {/* Cell Grid */}
                        {timeSlots.map((slot, i) => {
                            const duration = config.bookingRules?.defaultDuration || 90
                            const slotEnd = addMinutes(slot, duration)

                            // Determine Cell State
                            const booking = findBooking(court.id, slot, slotEnd)
                            const isLocked = !court.isActive
                            const price = calculatePrice(slot, config, court.id, court.basePrice)

                            // State: Reserved
                            if (booking) {
                                return (
                                    <div key={i} className="w-32 shrink-0 p-1 border-r border-zinc-800/50 bg-zinc-900/20">
                                        <button
                                            onClick={() => handleBookingClick(booking)}
                                            className={cn(
                                                "h-full w-full rounded flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-colors border relative overflow-hidden",
                                                booking.recurring_plan_id
                                                    ? "bg-blue-950/40 border-blue-500/50 hover:bg-blue-900/50 border-l-4 border-l-blue-400"
                                                    : booking.participant_checkin
                                                        ? "bg-emerald-900/40 border-emerald-500/50 hover:bg-emerald-900/60"
                                                        : "bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                                            )}
                                        >
                                            {/* Watermark for Recurring */}
                                            {booking.recurring_plan_id && (
                                                <div className="absolute top-0 right-0 p-0.5 bg-blue-500/20 rounded-bl">
                                                    <Repeat className="h-3 w-3 text-blue-400" />
                                                </div>
                                            )}
                                            <span className={cn(
                                                "text-xs font-bold truncate w-full flex items-center justify-center gap-1",
                                                booking.recurring_plan_id
                                                    ? "text-blue-100"
                                                    : booking.participant_checkin ? "text-emerald-400" : "text-red-400"
                                            )}>
                                                <span className="truncate">
                                                    {booking.title || 'Reservado'}
                                                </span>
                                            </span>

                                            {/* Payment Status Indicator */}
                                            {booking.paymentStatus === 'paid' ? (
                                                <span className="text-[10px] text-emerald-500 flex items-center gap-1 mt-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Pagado
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-1 font-semibold">
                                                    <AlertCircle className="h-3 w-3" /> Pendiente
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                )
                            }

                            // State: Blocked (Inactive Court)
                            if (isLocked) {
                                return (
                                    <div key={i} className="w-32 shrink-0 p-1 border-r border-zinc-800/50 bg-zinc-950">
                                        <div className="h-full w-full rounded bg-zinc-900/50 flex items-center justify-center border border-zinc-800/50 text-zinc-600 cursor-not-allowed">
                                            <Lock className="h-4 w-4" />
                                        </div>
                                    </div>
                                )
                            }

                            // State: Free (Available)
                            return (
                                <div key={i} className="w-32 shrink-0 p-1 border-r border-zinc-800/50">
                                    <button
                                        onClick={() => handleCellClick(court.id, court.name, slot, price)}
                                        className="h-full w-full rounded group/cell relative overflow-hidden transition-all hover:ring-2 hover:ring-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 flex flex-col items-center justify-center gap-1"
                                    >
                                        <span className="text-xs font-bold text-emerald-400 opacity-80 group-hover/cell:opacity-100 transition-opacity">
                                            ${price}
                                        </span>
                                        <div className="opacity-0 group-hover/cell:opacity-100 absolute inset-0 flex items-center justify-center bg-emerald-500/20 backdrop-blur-[1px] transition-all duration-200">
                                            <Plus className="h-5 w-5 text-emerald-400 drop-shadow-md" />
                                        </div>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Manual Booking Modal */}
            <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nueva Reserva Manual</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Crear reserva para <span className="text-white font-medium">{selectedSlot?.courtName}</span> a las <span className="text-white font-medium">{selectedSlot && format(selectedSlot.startTime, 'HH:mm')}</span>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre del Cliente / Reserva</Label>
                            <div className="relative z-20">
                                <MemberSelector
                                    onSelect={(member) => {
                                        setBookingForm(prev => ({
                                            ...prev,
                                            name: member.name,
                                            userId: member.id,
                                            phone: member.phone || '',
                                            email: member.email || ''
                                        }))
                                    }}
                                    initialName={bookingForm.name}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <PhoneInput
                                    placeholder="Ingresa número de teléfono"
                                    defaultCountry="VE"
                                    value={bookingForm.phone}
                                    onChange={(value) => setBookingForm(prev => ({ ...prev, phone: value || '' }))}
                                    className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Email (Opcional)</Label>
                                <Input
                                    placeholder="ejemplo@correo.com"
                                    value={bookingForm.email}
                                    onChange={(e) => setBookingForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="bg-zinc-900 border-zinc-700"
                                />
                            </div>
                        </div>

                        <div className="p-2.5 bg-zinc-900/50 rounded border border-zinc-800/50 text-xs text-zinc-400">
                            <p className="flex items-start gap-2">
                                <UserCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>
                                    {bookingForm.userId
                                        ? "Usuario de App vinculado. El teléfono está protegido."
                                        : "Usuario Manual. Completa los datos para enriquecer la ficha."}
                                </span>
                            </p>
                        </div>

                        <div className="flex items-center space-x-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                            <Checkbox
                                id="isPaid"
                                checked={bookingForm.isPaid}
                                onCheckedChange={(checked) => setBookingForm({ ...bookingForm, isPaid: checked as boolean })}
                                className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="isPaid" className="font-medium cursor-pointer">
                                    Pago Recibido
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Marcar si el cliente ya pagó la reserva (${selectedSlot?.price}).
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedSlot(null)} className="border-zinc-700 hover:bg-zinc-800 text-white hover:text-white">
                            Cancelar
                        </Button>
                        <Button
                            onClick={submitBooking}
                            disabled={isSubmitting || !bookingForm.name.trim() || bookingForm.name.trim().toLowerCase() === 'reserva' || (!bookingForm.userId && !bookingForm.phone)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Booking Modal */}
            <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Gestionar Reserva</DialogTitle>
                        <DialogDescription className="text-zinc-400 flex flex-col gap-2 items-start">
                            <span>Editar o cancelar la reserva de {editingBooking?.title || 'Cliente'}.</span>
                            {editingBooking?.recurring_plan_id && (
                                <div className="flex flex-col gap-1 mt-1">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 max-w-fit">
                                        <Repeat className="w-3 h-3 mr-1.5" /> Socio Fijo Activo
                                    </span>
                                    <span className="text-[10px] text-zinc-500">
                                        Esta reserva es parte de un plan recurrente (ID: {editingBooking.recurring_plan_id.slice(0, 8)}...)
                                    </span>
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Scrollable Content */}
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">

                        {/* ALERT: Contact Mismatch (Girlfriend Scenario) */}
                        {(editingBooking?.metadata?.alt_contact || editingBooking?.metadata?.alt_email) && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 mb-2 animate-in fade-in slide-in-from-top-1">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-500 mb-1">
                                    <AlertCircle className="h-4 w-4" />
                                    Datos de Contacto Alternativos
                                </h4>
                                <p className="text-xs text-amber-200/80 mb-2">
                                    Esta reserva tiene datos de contacto diferentes al perfil del usuario registrado.
                                </p>
                                <div className="space-y-1">
                                    {editingBooking.metadata.alt_contact && (
                                        <div className="flex items-center gap-2 text-xs text-amber-100 bg-amber-500/20 px-2 py-1 rounded w-fit">
                                            <Phone className="h-3 w-3" />
                                            <span>Reserva: {editingBooking.metadata.alt_contact}</span>
                                        </div>
                                    )}
                                    {editingBooking.metadata.alt_email && (
                                        <div className="flex items-center gap-2 text-xs text-amber-100 bg-amber-500/20 px-2 py-1 rounded w-fit">
                                            <span className="font-bold">@</span>
                                            <span>Reserva: {editingBooking.metadata.alt_email}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STAFF QUICK ACTIONS */}
                        <div className="grid grid-cols-2 gap-3 pb-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (onUpdateBooking && editingBooking) {
                                        onUpdateBooking(editingBooking.id, {
                                            name: bookingForm.name,
                                            isPaid: bookingForm.isPaid,
                                            startTime: bookingForm.startTime,
                                            endTime: bookingForm.endTime,
                                            courtId: bookingForm.courtId,
                                            totalPrice: bookingForm.newPrice,
                                            participant_checkin: !editingBooking.participant_checkin
                                        });
                                        setEditingBooking(prev => prev ? { ...prev, participant_checkin: !prev.participant_checkin } : null)
                                    }
                                }}
                                className={cn(
                                    "h-12 border-dashed border-2",
                                    editingBooking?.participant_checkin
                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                        : "border-zinc-700 hover:border-emerald-500 hover:text-emerald-400 text-zinc-400"
                                )}
                            >
                                <UserCheck className="mr-2 h-5 w-5" />
                                {editingBooking?.participant_checkin ? "Check-in Listo" : "Marcar Check-in"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    if (onUpdateBooking && editingBooking) {
                                        onUpdateBooking(editingBooking.id, {
                                            name: bookingForm.name,
                                            isPaid: true,
                                            startTime: bookingForm.startTime,
                                            endTime: bookingForm.endTime,
                                            courtId: bookingForm.courtId,
                                            totalPrice: bookingForm.newPrice,
                                            participant_checkin: editingBooking.participant_checkin
                                        })
                                        setBookingForm(prev => ({ ...prev, isPaid: true }))
                                    }
                                }}
                                className="h-12 border-dashed border-2 border-zinc-700 hover:border-amber-500 hover:text-amber-400 text-zinc-400"
                            >
                                <Banknote className="mr-2 h-5 w-5" />
                                Cobro Rápido
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nombre del Cliente / Reserva</Label>
                            <div className="relative">
                                <User className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                                <Input
                                    id="edit-name"
                                    value={bookingForm.name}
                                    onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                                    className="pl-9 bg-zinc-900 border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500/20"
                                    placeholder="Ej. Juan Pérez"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-courtId">Cancha</Label>
                                <Select
                                    value={bookingForm.courtId}
                                    onValueChange={handleCourtChange}
                                >
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700">
                                        {config.courts.filter(c => c.isActive).map(court => (
                                            <SelectItem key={court.id} value={court.id}>
                                                {court.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-timeBlock">Bloque de Horario</Label>
                                <Select
                                    value={format(bookingForm.startTime, 'HH:mm')}
                                    onValueChange={handleBlockSelection}
                                >
                                    <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-700 max-h-[300px]">
                                        {availableTimeBlocks.map(block => (
                                            <SelectItem key={block.value} value={block.value}>
                                                {block.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Payment Status Checkbox */}
                        <div className="flex items-center space-x-2 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                            <Checkbox
                                id="edit-isPaid"
                                checked={bookingForm.isPaid}
                                onCheckedChange={(checked) => setBookingForm({ ...bookingForm, isPaid: checked as boolean })}
                                className="border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="edit-isPaid" className="font-medium cursor-pointer">
                                    Pago Recibido
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Marcar si el cliente pagó la reserva.
                                </p>
                            </div>
                        </div>

                        {/* VISUAL FIX: Financial Blindness Prevention */}
                        <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                            <div className="flex items-center gap-2">
                                {editingBooking?.recurring_plan_id ? (
                                    <div className="flex items-center gap-1.5 text-blue-400">
                                        <Lock className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wider">Precio Contrato</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                        <Banknote className="w-4 h-4" />
                                        <span className="text-xs font-medium uppercase tracking-wider">Precio Reserva</span>
                                    </div>
                                )}
                            </div>
                            <span className="text-lg font-bold text-white">
                                ${bookingForm.originalPrice}
                            </span>
                        </div>

                        {conflictError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                                ⚠️ {conflictError}
                            </div>
                        )}

                        {/* Price Differential Display */}
                        {priceDifference !== 0 && (
                            <div className={cn(
                                "rounded-lg p-3 text-sm border",
                                priceDifference > 0
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            )}>
                                {priceDifference > 0 ? (
                                    <div>
                                        💰 <strong>Diferencia a cobrar:</strong> +${priceDifference}
                                        <p className="text-xs mt-1 opacity-80">
                                            Precio DB: ${bookingForm.originalPrice} → Nuevo precio: ${bookingForm.newPrice}
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        ✨ <strong>Saldo a favor del cliente:</strong> ${Math.abs(priceDifference)}
                                        <p className="text-xs mt-1 opacity-80">
                                            Precio DB: ${bookingForm.originalPrice} → Nuevo precio: ${bookingForm.newPrice}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-sm">
                            <div className="flex justify-between text-zinc-400">
                                <span>Duración:</span>
                                <span className="text-white">
                                    {format(bookingForm.startTime, 'HH:mm')} - {format(bookingForm.endTime, 'HH:mm')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Activity History */}
                    <div className="border-t border-zinc-800 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="h-4 w-4 text-zinc-400" />
                            <h4 className="text-sm font-semibold text-zinc-300">Historial de Cambios</h4>
                        </div>

                        {activityLogs.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {activityLogs.map((log, index) => {
                                    const actionMap: Record<string, string> = {
                                        'created': 'creó la reserva',
                                        'updated': 'actualizó',
                                        'cancelled': 'canceló la reserva',
                                        'payment_updated': 'actualizó el pago'
                                    }
                                    const actionText = actionMap[log.action] || log.action

                                    const timeAgo = formatDistanceToNow(new Date(log.created_at), {
                                        addSuffix: true,
                                        locale: es
                                    })

                                    // Translate notes to Spanish
                                    const translateNotes = (notes: string) => {
                                        if (!notes) return notes
                                        return notes
                                            // Payment status translations
                                            .replace(/\bpaid\b/gi, 'Pagado')
                                            .replace(/\bpending\b/gi, 'Pendiente')
                                            .replace(/\bpartially_paid\b/gi, 'Parcialmente Pagado')
                                            // Action translations (in case they appear in notes)
                                            .replace(/\bcreated\b/gi, 'creada')
                                            .replace(/\bupdated\b/gi, 'actualizada')
                                            .replace(/\bcancelled\b/gi, 'cancelada')
                                            // Common words
                                            .replace(/\bPayment\b/gi, 'Pago')
                                            .replace(/\bStatus\b/gi, 'Estado')
                                    }

                                    return (
                                        <div key={log.id || index} className="flex items-start gap-2 text-xs text-zinc-400 bg-zinc-900/50 p-2 rounded">
                                            <div className="flex-1">
                                                <span className="text-zinc-300 font-medium">
                                                    {log.user?.full_name || log.user?.email || 'Sistema'}
                                                </span>
                                                {' '}{actionText}
                                                {log.notes && (
                                                    <span className="block text-zinc-500 mt-0.5">
                                                        {translateNotes(log.notes)}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-zinc-500 whitespace-nowrap">{timeAgo}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-500 italic text-center py-3">
                                Sin actividad reciente
                            </p>
                        )}
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="destructive"
                            onClick={handleDeleteBooking}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
                        >
                            Cancelar Reserva
                        </Button>
                        <div className="flex gap-2 flex-1">
                            <Button variant="outline" onClick={() => setEditingBooking(null)} className="flex-1 border-zinc-700">
                                Cerrar
                            </Button>
                            <Button
                                onClick={handleUpdateBooking}
                                disabled={isSubmitting || !bookingForm.name.trim()}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
