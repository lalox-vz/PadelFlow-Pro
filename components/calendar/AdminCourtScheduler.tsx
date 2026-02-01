"use client"

import { useState, useEffect } from "react"
import { format, addDays, subDays, isSameDay, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Lock, Plus, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface Court {
    id: string
    name: string
}

interface Booking {
    id: string
    court_id: string
    start_time: string
    end_time: string
    title?: string
    type?: 'booking' | 'maintenance' | 'blocked' | 'class'
    is_recurring?: boolean
    payment_status?: 'paid' | 'pending' | 'partial'
}

interface AdminCourtSchedulerProps {
    courts: Court[]
    bookings: Booking[]
    onBookingCreate: (booking: any) => Promise<void>
    onBookingUpdate?: (booking: any) => Promise<void>
    onBlockSlot?: (slot: any) => Promise<void>
}

// Generate time slots from 7:00 to 23:00
const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 7
    return `${hour.toString().padStart(2, '0')}:00`
})

export function AdminCourtScheduler({ courts, bookings, onBookingCreate, onBookingUpdate, onBlockSlot }: AdminCourtSchedulerProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedSlot, setSelectedSlot] = useState<{ courtId: string, time: string } | null>(null)
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [isBlockMode, setIsBlockMode] = useState(false)
    const { toast } = useToast()

    // Form State
    const [bookingTitle, setBookingTitle] = useState("")
    const [isRecurring, setIsRecurring] = useState(false)
    const [paymentStatus, setPaymentStatus] = useState("pending")

    const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1))
    const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1))
    const handleToday = () => setCurrentDate(new Date())

    const handleSlotClick = (courtId: string, time: string) => {
        const slotDate = new Date(currentDate)
        const [hours] = time.split(':')
        slotDate.setHours(parseInt(hours), 0, 0, 0)

        // Find if exists
        const existing = bookings.find(b =>
            b.court_id === courtId &&
            new Date(b.start_time).getTime() === slotDate.getTime()
        )

        if (existing) {
            // Handle edit or view details
            toast({ title: "Booking Details", description: `Booking ID: ${existing.id}` })
            return
        }

        if (isBlockMode) {
            // Quick Block
            onBlockSlot?.({
                court_id: courtId,
                start_time: slotDate.toISOString(),
                end_time: new Date(slotDate.getTime() + 60 * 60 * 1000).toISOString(),
                type: 'blocked',
                title: 'Mantenimiento / Bloqueado'
            })
        } else {
            setSelectedSlot({ courtId, time })
            setBookingTitle("")
            setIsRecurring(false)
            setPaymentStatus("pending")
            setIsBookingModalOpen(true)
        }
    }

    const handleCreateBooking = async () => {
        if (!selectedSlot) return

        const startDate = new Date(currentDate)
        const [hours] = selectedSlot.time.split(':')
        startDate.setHours(parseInt(hours), 0, 0, 0)

        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour default

        const bookingData = {
            court_id: selectedSlot.courtId,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            title: bookingTitle || "Reserva Cliente",
            type: 'booking',
            payment_status: paymentStatus,
            is_recurring: isRecurring
        }

        try {
            await onBookingCreate(bookingData)
            setIsBookingModalOpen(false)
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevDay}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-lg font-semibold w-48 text-center capitalize">
                        {format(currentDate, "EEEE, d MMM yyyy", { locale: es })}
                    </div>
                    <Button variant="outline" size="icon" onClick={handleNextDay}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" onClick={handleToday} className="ml-2">Hoy</Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="block-mode" className="cursor-pointer">Modo Bloqueo Rápido</Label>
                        <Switch
                            id="block-mode"
                            checked={isBlockMode}
                            onCheckedChange={setIsBlockMode}
                        />
                        <Lock className={cn("h-4 w-4", isBlockMode ? "text-red-500" : "text-muted-foreground")} />
                    </div>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden bg-card shadow-sm overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr] border-b">
                        <div className="p-4 font-medium text-muted-foreground text-center border-r bg-muted/30">Hora</div>
                        {courts.map(court => (
                            <div key={court.id} className="p-4 font-bold text-center border-r last:border-r-0 bg-muted/10">
                                {court.name}
                            </div>
                        ))}
                    </div>

                    {/* Time Slots */}
                    {TIME_SLOTS.map(time => (
                        <div key={time} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr] border-b last:border-b-0 min-h-[60px]">
                            <div className="p-2 text-sm text-muted-foreground text-center border-r flex items-center justify-center bg-muted/5">
                                {time}
                            </div>
                            {courts.map(court => {
                                const slotBooking = bookings.find(b => {
                                    const bDate = new Date(b.start_time)
                                    const [h] = time.split(':')
                                    return b.court_id === court.id &&
                                        isSameDay(bDate, currentDate) &&
                                        bDate.getHours() === parseInt(h)
                                })

                                return (
                                    <div
                                        key={`${court.id}-${time}`}
                                        className={cn(
                                            "relative border-r last:border-r-0 p-1 cursor-pointer transition-colors hover:bg-muted/50",
                                            slotBooking?.type === 'blocked' ? "bg-red-100/50 hover:bg-red-100 dark:bg-red-900/20" : "",
                                            slotBooking?.type === 'booking' ? "bg-[#ccff00]/20 hover:bg-[#ccff00]/30" : ""
                                        )}
                                        onClick={() => handleSlotClick(court.id, time)}
                                    >
                                        {slotBooking ? (
                                            <div className={cn(
                                                "w-full h-full rounded p-2 text-xs font-medium flex flex-col justify-between",
                                                slotBooking.type === 'blocked' ? "text-red-700 dark:text-red-300" : "text-primary"
                                            )}>
                                                <span className="truncate">{slotBooking.title || 'Reserva'}</span>
                                                {slotBooking.is_recurring && (
                                                    <Repeat className="h-3 w-3 absolute top-1 right-1 opacity-50" />
                                                )}
                                                {slotBooking.payment_status === 'pending' && slotBooking.type === 'booking' && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1 w-fit border-red-200 text-red-600 bg-red-50">
                                                        Pendiente
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100">
                                                <Plus className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Booking Modal */}
            <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva Reserva</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Título / Cliente</Label>
                            <Input
                                placeholder="Nombre del cliente o evento"
                                value={bookingTitle}
                                onChange={(e) => setBookingTitle(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center justify-between border p-3 rounded-md">
                            <div className="flex items-center gap-2">
                                <Repeat className="h-4 w-4 text-muted-foreground" />
                                <Label htmlFor="recurring" className="cursor-pointer">Reserva Fija (Mensual)</Label>
                            </div>
                            <Switch
                                id="recurring"
                                checked={isRecurring}
                                onCheckedChange={setIsRecurring}
                            />
                        </div>
                        {isRecurring && (
                            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                Esta reserva se repetirá automáticamente durante las próximas 4 semanas en este horario.
                            </p>
                        )}
                        <div className="grid gap-2">
                            <Label>Estado de Pago</Label>
                            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">Pagado</SelectItem>
                                    <SelectItem value="pending">Pendiente</SelectItem>
                                    <SelectItem value="partial">Parcial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateBooking} className="bg-[#ccff00] text-black hover:bg-[#b3e600]">
                            Confirmar Reserva
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
