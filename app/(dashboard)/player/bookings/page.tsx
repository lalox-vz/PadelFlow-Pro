"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, MapPin, ChevronRight, History, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

export default function PlayerBookingsPage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>([])
    const [pastBookings, setPastBookings] = useState<any[]>([])

    useEffect(() => {
        if (user) {
            fetchBookings()
        }
    }, [user])

    const fetchBookings = async () => {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    id,
                    start_time,
                    end_time,
                    status,
                    payment_status,
                    court:courts (
                        name,
                        club:entities (
                            name
                        )
                    )
                `)
                .eq('user_id', user?.id)
                .order('start_time', { ascending: false })

            if (error) throw error

            const now = new Date()
            const upcoming = []
            const past = []

            for (const booking of data || []) {
                const startDate = new Date(booking.start_time)
                const endDate = new Date(booking.end_time)

                // Safe access to court and club
                // Supabase joins often return arrays even for single relations depending on types
                const courtData = Array.isArray(booking.court) ? booking.court[0] : booking.court
                const clubData = courtData ? (Array.isArray(courtData.club) ? courtData.club[0] : courtData.club) : null

                const clubName = clubData?.name || 'Club'
                const courtName = courtData?.name || 'Cancha'

                const item = {
                    ...booking,
                    title: "Reserva de Cancha",
                    location: clubName,
                    courtName: courtName,
                    dateStr: format(startDate, "d MMM, yyyy", { locale: es }),
                    timeStr: `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`,
                }

                if (startDate < now) {
                    past.push(item)
                } else {
                    upcoming.push(item)
                }
            }

            setUpcomingBookings(upcoming)
            setPastBookings(past)

        } catch (error) {
            console.error("Error fetching bookings:", error)
            toast({
                title: "Error",
                description: "No se pudieron cargar tus reservas.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto p-6">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Mis Reservas</h1>
                    <p className="text-muted-foreground mt-1">Gestiona tus próximos partidos y reservas de pista.</p>
                </div>
                <Link href="/player/explore">
                    <Button className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-semibold">
                        + Nueva Reserva
                    </Button>
                </Link>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                    <TabsTrigger value="upcoming">Próximos</TabsTrigger>
                    <TabsTrigger value="history">Historial</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="mt-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : upcomingBookings.length > 0 ? (
                        upcomingBookings.map((booking) => (
                            <div key={booking.id} className="group relative flex flex-col sm:flex-row bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                                {/* Left Accent Bar */}
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ccff00]"></div>

                                <div className="p-5 flex-1 flex flex-col sm:flex-row gap-4 sm:items-center">
                                    <div className="h-12 w-12 rounded-full bg-[#ccff00]/20 flex items-center justify-center flex-shrink-0">
                                        <CalendarDays className="h-6 w-6 text-[#aacc00]" />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-foreground">{booking.title}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${booking.status === 'confirmed'
                                                ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                                : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                                                }`}>
                                                {booking.status === 'confirmed' ? 'Confirmado' : booking.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:gap-6 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {booking.dateStr}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                {booking.timeStr}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {booking.location} • {booking.courtName}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 sm:pt-0 sm:border-l sm:pl-6 border-t sm:border-t-0 border-border">
                                        <Button variant="outline" size="sm" className="w-full sm:w-auto">Detalles</Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed border-border">
                            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-foreground">No tienes reservas próximas</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                ¡Es hora de jugar! Busca una cancha disponible.
                            </p>
                            <Link href="/player/explore">
                                <Button>Explorar Canchas</Button>
                            </Link>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="mt-6 space-y-4">
                    {pastBookings.map((booking) => (
                        <div key={booking.id} className="flex flex-col sm:flex-row bg-card/50 border border-border rounded-xl p-5 gap-4 items-center opacity-80 hover:opacity-100 transition-opacity">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 grayscale">
                                <History className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-foreground">{booking.title}</h3>
                                <p className="text-sm text-muted-foreground">{booking.dateStr} • {booking.location}</p>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground capitalize">
                                {booking.status}
                            </div>
                            <Button variant="secondary" size="sm" asChild>
                                <Link href="/player/explore">Reservar de nuevo</Link>
                            </Button>
                        </div>
                    ))}
                    {pastBookings.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No tienes historial de reservas.
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
