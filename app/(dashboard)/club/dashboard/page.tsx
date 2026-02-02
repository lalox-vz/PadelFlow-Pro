"use client"

import { useAuth } from "@/context/AuthContext"
import { useWorkspace } from "@/context/WorkspaceContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, Users, Activity, CreditCard, Calendar, Loader2, ChevronRight, Clock, MapPin, User, CheckCircle2, Search, Filter, MessageCircle, CheckSquare, X } from "lucide-react"
import { ClubHostingRequests } from "@/components/club/ClubHostingRequests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"

import { SmartRevenueChart } from "@/components/club/dashboard/SmartRevenueChart"
import { supabase } from "@/lib/supabase"
import { startOfMonth, endOfMonth, subDays, addDays, format, isValid, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { parsePhoneNumber } from 'react-phone-number-input'
import { TopSpenders } from "@/components/dashboard/TopSpenders"

interface PendingBooking {
    id: string
    start_time: string
    end_time: string
    price: number
    court: { name: string } | null
    user: { full_name: string, phone: string } | null
    original_title?: string
}

interface ActiveClient {
    id: string
    full_name: string
    phone: string
    count: number
    spent: number
    lastDate: string
}

export default function ClubDashboardPage() {
    const { user, profile } = useAuth()
    const { activeWorkspace } = useWorkspace()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState<any>({
        kpi: {
            totalRevenue: 0,
            revenueGrowth: 0,
            totalBookings: 0,
            bookingsGrowth: 0,
            activeClients: 0,
            clientsGrowth: 0,
            occupancyRate: 0,
            occupancyGrowth: 0
        }
    })

    // Pending Payments State
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)
    const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([])
    const [sheetOpen, setSheetOpen] = useState(false)

    // Filters & Pagination
    const [searchQuery, setSearchQuery] = useState("")
    const [dateFilter, setDateFilter] = useState("")
    const [limit, setLimit] = useState(20)
    const [loadingPending, setLoadingPending] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    const [todayBookings, setTodayBookings] = useState(0)
    const [popularCourts, setPopularCourts] = useState<any[]>([])

    // Active Clients State
    const [activeClientsList, setActiveClientsList] = useState<ActiveClient[]>([])
    const [activeClientsSheetOpen, setActiveClientsSheetOpen] = useState(false)
    const [loadingActiveClients, setLoadingActiveClients] = useState(false)
    const [activeClientsSearch, setActiveClientsSearch] = useState("")
    const [activeClientsDateFilter, setActiveClientsDateFilter] = useState("")

    useEffect(() => {
        if (profile?.role === 'club_staff') {
            router.push('/club/calendar')
        }
    }, [profile, router])

    const fetchPendingPayments = useCallback(async () => {
        if (!profile?.organization_id) return

        setLoadingPending(true)
        try {
            // 1. Fetch Bookings (Flat selection for maximum reliability)
            // We include 'title' to support manual bookings that don't have a linked account
            let query = supabase
                .from('bookings')
                .select(`
                    id,
                    start_time,
                    end_time,
                    price,
                    court_id,
                    user_id,
                    title
                `, { count: 'exact' })
                .eq('entity_id', profile.organization_id)
                .eq('payment_status', 'pending')
                .order('start_time', { ascending: true })

            // Apply Date Filter with Timezone Buffer (UTC-4)
            if (dateFilter) {
                // Determine start and end of day in VET (UTC-4)
                // 00:00 VET is 04:00 UTC
                // 23:59 VET is 03:59 UTC Next Day
                // We'll fetch a slightly wider buffer (-5h to +29h relative to local 00:00) to be safe
                const localDate = parseISO(dateFilter)
                const startUtc = addDays(localDate, 0).toISOString() // This is 00:00 local if interpreted as local, but effectively let's just use string manipulation for safety or date-fns-tz if available.
                // Simpler approach: construct string limits that cover the UTC range for that day in VET.
                // VET is UTC-4. So 2024-01-01 in VET goes from 2024-01-01T04:00:00Z to 2024-01-02T03:59:59Z.

                const startDay = new Date(dateFilter)
                startDay.setUTCHours(4, 0, 0, 0) // 04:00 UTC = 00:00 VET

                const endDay = new Date(startDay)
                endDay.setUTCDate(endDay.getUTCDate() + 1)
                endDay.setUTCHours(3, 59, 59, 999) // 03:59:59 next day UTC = 23:59:59 VET

                query = query.gte('start_time', startDay.toISOString())
                query = query.lte('start_time', endDay.toISOString())
            }

            // Execute Query AND Fetch Courts in parallel
            const [bookingsResult, courtsResult] = await Promise.all([
                query.limit(limit),
                supabase.from('courts').select('id, name').eq('organization_id', profile.organization_id)
            ])

            const bookingsData = bookingsResult.data
            const courtsData = courtsResult.data

            const courtsMap: Record<string, string> = {}
            if (courtsData) {
                courtsData.forEach((c: any) => { courtsMap[c.id] = c.name })
            }

            let finalBookings: PendingBooking[] = []

            if (bookingsData) {
                // 2. Collect User IDs for manual fetch
                const userIds = Array.from(new Set(bookingsData.map((b: any) => b.user_id).filter(Boolean)))

                // 3. Fetch Users Details (try 'users' table which is cleaner)
                // Note: The public table is likely 'users'.
                let usersMap: Record<string, any> = {}

                if (userIds.length > 0) {
                    const { data: usersData } = await supabase
                        .from('users')
                        .select('id, full_name, phone')
                        .in('id', userIds)

                    if (usersData) {
                        usersData.forEach((u: any) => { usersMap[u.id] = u })
                    }
                }

                // 4. Merge Data
                finalBookings = bookingsData.map((b: any) => {
                    const user = usersMap[b.user_id]

                    // Logic to determine display name:
                    // 1. Registered User Name
                    // 2. Manual Booking Title (e.g. "Juan Perez")
                    // 3. Fallback "Cliente"
                    const displayName = user?.full_name || b.title || 'Cliente'

                    return {
                        id: b.id,
                        start_time: b.start_time,
                        end_time: b.end_time,
                        price: b.price,
                        court: { name: courtsMap[b.court_id] || 'Cancha' },
                        user: {
                            full_name: displayName,
                            phone: user?.phone || ''
                        },
                        // We store the original title just in case
                        original_title: b.title
                    }
                })

                // 5. Client-side Search Application
                if (searchQuery) {
                    const lower = searchQuery.toLowerCase()
                    finalBookings = finalBookings.filter(b =>
                        b.user?.full_name?.toLowerCase().includes(lower) ||
                        b.user?.phone?.includes(lower)
                    )
                }
            }

            setPendingBookings(finalBookings)

            // 6. Fetch Global Counter (Badge)
            const { count: totalCount } = await supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('entity_id', profile.organization_id)
                .eq('payment_status', 'pending')

            setPendingPaymentsCount(totalCount || 0)

        } catch (error) {
            console.error('Error fetching pending payments:', error)
        } finally {
            setLoadingPending(false)
        }
    }, [profile?.organization_id, limit, searchQuery, dateFilter])



    // Load initial data
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!profile?.organization_id) return

            setLoading(true)
            try {
                const now = new Date()
                const monthStart = startOfMonth(now)
                const monthEnd = endOfMonth(now)

                // 1. KPI Stats
                const { data: statsData } = await supabase.rpc('get_dashboard_stats', {
                    p_organization_id: profile.organization_id,
                    p_start_date: monthStart.toISOString(),
                    p_end_date: monthEnd.toISOString()
                })
                if (statsData) setStats(statsData)

                // 2. Pending Bookings (Initial Load)
                await fetchPendingPayments()

                // 3. Today's Bookings
                const today = new Date()
                const todayStr = today.toISOString().split('T')[0]
                const { count: todayCount } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('entity_id', profile.organization_id)
                    .gte('start_time', `${todayStr}T00:00:00`)
                    .lt('start_time', `${todayStr}T23:59:59`)
                    .neq('payment_status', 'canceled')
                setTodayBookings(todayCount || 0)

                // 4. Popular Courts
                const { data: courtsData } = await supabase
                    .from('courts')
                    .select('id, name')
                    .eq('club_id', profile.organization_id)
                    .eq('is_active', true)

                if (courtsData && courtsData.length > 0) {
                    const courtStats = await Promise.all(
                        courtsData.map(async (court) => {
                            const { data: bookings } = await supabase
                                .from('bookings')
                                .select('start_time, end_time')
                                .eq('court_id', court.id)
                                .gte('start_time', monthStart.toISOString())
                                .lte('start_time', monthEnd.toISOString())
                                .neq('payment_status', 'canceled')

                            let totalHours = 0
                            if (bookings) {
                                bookings.forEach(b => {
                                    const start = new Date(b.start_time)
                                    const end = new Date(b.end_time)
                                    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                                    totalHours += hours
                                })
                            }
                            return { name: court.name, hours: totalHours }
                        })
                    )
                    const sortedCourts = courtStats.sort((a, b) => b.hours - a.hours)
                    const maxHours = Math.max(...sortedCourts.map(c => c.hours), 1)
                    setPopularCourts(sortedCourts.map(c => ({
                        ...c,
                        percent: `${Math.round((c.hours / maxHours) * 100)}%`
                    })))
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboardData()
    }, [profile?.organization_id]) // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch pending when filters change
    useEffect(() => {
        if (sheetOpen) {
            fetchPendingPayments()
        }
    }, [fetchPendingPayments, sheetOpen])

    const fetchActiveClients = useCallback(async () => {
        if (!profile?.organization_id) return

        setLoadingActiveClients(true)
        try {
            const now = new Date()
            let start = startOfMonth(now).toISOString()
            let end = endOfMonth(now).toISOString()

            // Apply Date Filter if present (Matches Dashboard logic or Specific Day)
            if (activeClientsDateFilter) {
                const startDay = new Date(activeClientsDateFilter)
                startDay.setUTCHours(4, 0, 0, 0) // 00:00 VET

                const endDay = new Date(startDay)
                endDay.setUTCDate(endDay.getUTCDate() + 1)
                endDay.setUTCHours(3, 59, 59, 999) // 23:59 VET

                start = startDay.toISOString()
                end = endDay.toISOString()
            }

            // 1. Fetch Paid Bookings
            const { data: bookings } = await supabase
                .from('bookings')
                .select('user_id, price, start_time')
                .eq('entity_id', profile.organization_id)
                .in('payment_status', ['paid', 'approved', 'completed'])
                .gte('start_time', start)
                .lte('start_time', end)

            if (!bookings || bookings.length === 0) {
                setActiveClientsList([])
                return
            }

            // 2. Aggregate Data
            const userStats: Record<string, { count: number, spent: number, lastDate: string }> = {}
            const userIds = new Set<string>()

            bookings.forEach((b: any) => {
                if (!b.user_id) return
                userIds.add(b.user_id)

                if (!userStats[b.user_id]) {
                    userStats[b.user_id] = { count: 0, spent: 0, lastDate: b.start_time }
                }

                userStats[b.user_id].count += 1
                userStats[b.user_id].spent += (b.price || 0)

                if (b.start_time > userStats[b.user_id].lastDate) {
                    userStats[b.user_id].lastDate = b.start_time
                }
            })

            // 3. Fetch User Details
            let usersMap: Record<string, any> = {}
            if (userIds.size > 0) {
                const { data: usersData } = await supabase
                    .from('users')
                    .select('id, full_name, phone')
                    .in('id', Array.from(userIds))

                if (usersData) {
                    usersData.forEach((u: any) => { usersMap[u.id] = u })
                }
            }

            // 4. Merge
            let clients: ActiveClient[] = Array.from(userIds).map(uid => {
                const user = usersMap[uid]
                const stats = userStats[uid]
                return {
                    id: uid,
                    full_name: user?.full_name || 'Cliente',
                    phone: user?.phone || '',
                    ...stats
                }
            })

            // 5. Client-side Filter
            if (activeClientsSearch) {
                const lower = activeClientsSearch.toLowerCase()
                clients = clients.filter(c =>
                    c.full_name.toLowerCase().includes(lower) ||
                    c.phone.includes(lower)
                )
            }

            // Sort: High Value (Total Spent) Descending
            clients.sort((a, b) => b.spent - a.spent)

            setActiveClientsList(clients)

        } catch (error) {
            console.error('Error fetching active clients:', error)
        } finally {
            setLoadingActiveClients(false)
        }
    }, [profile?.organization_id, activeClientsSearch, activeClientsDateFilter])

    // Load Active Clients when sheet opens
    useEffect(() => {
        if (activeClientsSheetOpen) {
            fetchActiveClients()
        }
    }, [activeClientsSheetOpen, fetchActiveClients])

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)
    }

    const formatHours = (hours: number) => {
        if (hours === 0) return '0h'
        if (hours % 1 === 0) return `${hours}h`
        return `${hours.toFixed(1)}h`
    }

    // Actions
    const handleMarkAsPaid = async (bookingId: string) => {
        try {
            await supabase
                .from('bookings')
                .update({ payment_status: 'paid' })
                .eq('id', bookingId)

            setPendingBookings(prev => prev.filter(b => b.id !== bookingId))
            setPendingPaymentsCount(prev => prev - 1)
            setSelectedIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(bookingId)
                return newSet
            })
        } catch (error) {
            console.error('Error marking as paid:', error)
        }
    }

    const handleBulkMarkAsPaid = async () => {
        try {
            const ids = Array.from(selectedIds)
            await supabase
                .from('bookings')
                .update({ payment_status: 'paid' })
                .in('id', ids)

            setPendingBookings(prev => prev.filter(b => !selectedIds.has(b.id)))
            setPendingPaymentsCount(prev => prev - ids.length)
            setSelectedIds(new Set())
        } catch (error) {
            console.error('Error bulk marking as paid:', error)
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = pendingBookings.map(b => b.id)
            setSelectedIds(new Set(allIds))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) newSet.delete(id)
            else newSet.add(id)
            return newSet
        })
    }

    const handleSendWhatsApp = (booking: PendingBooking) => {
        if (!booking.user?.phone) return

        let phone = booking.user.phone.replace(/\D/g, '')
        // Ensure Venezuelan format if missing +
        if (phone.startsWith('0')) phone = '58' + phone.substring(1)
        if (!phone.startsWith('58')) phone = '58' + phone

        const message = `Hola ${booking.user.full_name}, te recordamos que tienes un pago pendiente de ${formatCurrency(booking.price)} por tu reserva de Padel el ${format(new Date(booking.start_time), "dd/MM")} a las ${format(new Date(booking.start_time), "HH:mm")}.`

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const handleContactClient = (client: ActiveClient) => {
        if (!client.phone) return

        let phone = client.phone.replace(/\D/g, '')
        if (phone.startsWith('0')) phone = '58' + phone.substring(1)
        if (!phone.startsWith('58')) phone = '58' + phone

        const message = `Hola ${client.full_name}, vimos que has estado activo este mes en el club. ¡Gracias por tu preferencia!`

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    if (loading) {
        return (
            <div className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#ccff00]" />
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Panel del Club</h1>
                <p className="text-muted-foreground">
                    Bienvenido de vuelta, {user?.user_metadata?.full_name || 'Owner'}.
                    Resumen de {format(new Date(), 'MMMM yyyy', { locale: es })}.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Pending Payments Alert */}
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <Card className={`border-l-4 shadow-md cursor-pointer transition-all hover:bg-accent group ${pendingPaymentsCount > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className={`text-sm font-medium ${pendingPaymentsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    Pagos Pendientes
                                </CardTitle>
                                <CreditCard className={`h-4 w-4 ${pendingPaymentsCount > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className={`text-2xl font-bold ${pendingPaymentsCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {pendingPaymentsCount}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {pendingPaymentsCount > 0 ? 'Requieren atención' : 'Todo al día'}
                                        </p>
                                    </div>
                                    <ChevronRight className={`h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${pendingPaymentsCount > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                                </div>
                            </CardContent>
                        </Card>
                    </SheetTrigger>
                    <SheetContent className="bg-zinc-950 border-zinc-800 w-[400px] sm:w-[600px] flex flex-col h-full">
                        <SheetHeader className="pb-4 border-b border-zinc-800">
                            <SheetTitle className="text-white flex items-center gap-2">
                                <CreditCard className={`h-5 w-5 ${pendingPaymentsCount > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
                                Pagos Pendientes ({pendingPaymentsCount})
                            </SheetTitle>
                            <SheetDescription className="text-zinc-400">
                                Gestiona los cobros pendientes de tus reservas.
                            </SheetDescription>
                        </SheetHeader>

                        {/* Controls Section */}
                        <div className="py-4 space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar cliente..."
                                        className="pl-9 bg-zinc-900 border-zinc-700"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Input
                                    type="date"
                                    className="w-[140px] bg-zinc-900 border-zinc-700"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>

                            {/* Bulk Actions Bar */}
                            {selectedIds.size > 0 && (
                                <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-md border border-zinc-800 animate-in fade-in slide-in-from-top-2">
                                    <span className="text-sm text-zinc-300 ml-2">
                                        {selectedIds.size} seleccionados
                                    </span>
                                    <Button
                                        size="sm"
                                        onClick={handleBulkMarkAsPaid}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        Marcar Pagados
                                    </Button>
                                </div>
                            )}

                            {/* Select All */}
                            <div className="flex items-center space-x-2 px-1">
                                <Checkbox
                                    id="select-all"
                                    checked={pendingBookings.length > 0 && selectedIds.size === pendingBookings.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                                <label
                                    htmlFor="select-all"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-zinc-400"
                                >
                                    Seleccionar todos los visibles
                                </label>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 -mr-2">
                            {loadingPending && pendingBookings.length === 0 ? (
                                <div className="flex justify-center items-center h-32">
                                    <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                                </div>
                            ) : pendingBookings.length > 0 ? (
                                pendingBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className={`p-3 rounded-lg border transition-colors ${selectedIds.has(booking.id) ? 'bg-zinc-800/50 border-emerald-500/30' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="pt-1">
                                                <Checkbox
                                                    checked={selectedIds.has(booking.id)}
                                                    onCheckedChange={() => handleToggleSelect(booking.id)}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    {/* Date & Time */}
                                                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                                                        {format(new Date(booking.start_time), "EEEE d MMM", { locale: es })}
                                                    </div>
                                                    <div className="text-sm font-bold text-[#ccff00]">
                                                        {formatCurrency(booking.price || 0)}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(booking.start_time), "HH:mm")} - {format(new Date(booking.end_time), "HH:mm")}
                                                    <span className="text-zinc-600">|</span>
                                                    <MapPin className="h-3 w-3" />
                                                    {booking.court?.name || 'Cancha'}
                                                </div>

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                                                        <User className="h-3.5 w-3.5 text-zinc-500" />
                                                        <span className="truncate max-w-[120px] sm:max-w-[150px]">
                                                            {booking.user?.full_name || 'Cliente'}
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        {booking.user?.phone && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-500/10"
                                                                onClick={() => handleSendWhatsApp(booking)}
                                                                title="Enviar recordatorio por WhatsApp"
                                                            >
                                                                <MessageCircle className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs border-emerald-600 text-emerald-500 hover:bg-emerald-600 hover:text-white px-2"
                                                            onClick={() => handleMarkAsPaid(booking.id)}
                                                        >
                                                            Pagar
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-zinc-500">
                                    <div className="flex justify-center mb-4">
                                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                        </div>
                                    </div>
                                    <p className="text-lg font-medium text-white">¡Todo al día!</p>
                                    <p className="text-sm">No se encontraron pagos pendientes con estos filtros.</p>
                                </div>
                            )}

                            {/* Load More */}
                            {pendingBookings.length >= limit && (
                                <Button
                                    variant="ghost"
                                    className="w-full mt-2 text-zinc-400 hover:text-white"
                                    onClick={() => setLimit(prev => prev + 20)}
                                    disabled={loadingPending}
                                >
                                    {loadingPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cargar más"}
                                </Button>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Total Revenue */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.kpi.totalRevenue || 0)}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.kpi.revenueGrowth >= 0 ? '+' : ''}{stats.kpi.revenueGrowth?.toFixed(1) || 0}% vs mes anterior
                        </p>
                    </CardContent>
                </Card>

                {/* Today's Bookings */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reservas Hoy</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{todayBookings}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.kpi.totalBookings || 0} este mes
                        </p>
                    </CardContent>
                </Card>

                {/* Occupancy */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
                        <Activity className="h-4 w-4 text-[#ccff00]" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.kpi.occupancyRate || 0}%</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.kpi.occupancyGrowth >= 0 ? '+' : ''}{stats.kpi.occupancyGrowth?.toFixed(1) || 0}% vs mes anterior
                        </p>
                    </CardContent>
                </Card>

                {/* Active Clients Sheet */}
                <Sheet open={activeClientsSheetOpen} onOpenChange={setActiveClientsSheetOpen}>
                    <SheetTrigger asChild>
                        <Card className="cursor-pointer transition-all hover:bg-accent hover:border-purple-500/50 group">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
                                <Users className="h-4 w-4 text-purple-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-2xl font-bold">{stats.kpi.activeClients || 0}</div>
                                        <p className="text-xs text-muted-foreground">
                                            {stats.kpi.clientsGrowth >= 0 ? '+' : ''}{stats.kpi.clientsGrowth?.toFixed(1) || 0}% vs mes anterior
                                        </p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-purple-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </SheetTrigger>
                    <SheetContent className="bg-zinc-950 border-zinc-800 w-[400px] sm:w-[540px] flex flex-col h-full">
                        <SheetHeader className="pb-4 border-b border-zinc-800">
                            <SheetTitle className="text-white flex items-center gap-2">
                                <Users className="h-5 w-5 text-purple-500" />
                                Clientes Activos ({activeClientsList.length})
                            </SheetTitle>
                            <SheetDescription className="text-zinc-400">
                                Tus mejores clientes {activeClientsDateFilter ? 'del día seleccionado' : 'de este mes'}.
                            </SheetDescription>
                        </SheetHeader>

                        {/* Controls */}
                        <div className="py-4 space-y-4">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre..."
                                        className="pl-9 bg-zinc-900 border-zinc-700"
                                        value={activeClientsSearch}
                                        onChange={(e) => setActiveClientsSearch(e.target.value)}
                                    />
                                </div>
                                <Input
                                    type="date"
                                    className="w-[140px] bg-zinc-900 border-zinc-700"
                                    value={activeClientsDateFilter}
                                    onChange={(e) => setActiveClientsDateFilter(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 -mr-2">
                            {loadingActiveClients ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                                </div>
                            ) : activeClientsList.length > 0 ? (
                                activeClientsList.map((client) => (
                                    <div
                                        key={client.id}
                                        className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 transition-colors flex items-center justify-between group/item"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                                <span className="text-purple-400 font-semibold text-sm">
                                                    {client.full_name.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{client.full_name}</div>
                                                <div className="text-xs text-zinc-400 flex items-center gap-2">
                                                    <span className="text-purple-400 font-medium">
                                                        {client.count} reservas
                                                    </span>
                                                    <span>•</span>
                                                    <span>Ultima: {format(new Date(client.lastDate), "d MMM", { locale: es })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-emerald-500">
                                                    {formatCurrency(client.spent)}
                                                </div>
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                                    Total Gastado
                                                </div>
                                            </div>

                                            {client.phone && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-zinc-400 hover:text-green-500 hover:bg-green-500/10 opacity-0 group-hover/item:opacity-100 transition-all"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleContactClient(client)
                                                    }}
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-zinc-500">
                                    <Users className="h-12 w-12 mx-auto text-zinc-700 mb-3" />
                                    <p>No se encontraron clientes activos en este periodo.</p>
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Revenue Chart - LAST 7 DAYS for quick operational overview */}
                <SmartRevenueChart
                    externalDateRange={{
                        from: subDays(new Date(), 6), // Last 7 days including today
                        to: new Date()
                    }}
                    hideControls={true}
                    title="Ingresos Recientes"
                    description="Últimos 7 días"
                />

                {/* Popular Courts - Real Data with Smart Hours */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Canchas Más Populares</CardTitle>
                        <CardDescription>
                            Horas reservadas este mes
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {popularCourts.length > 0 ? (
                                popularCourts.slice(0, 5).map((court, i) => (
                                    <div key={i} className="flex items-center">
                                        <div className="ml-4 space-y-1 flex-1">
                                            <p className="text-sm font-medium leading-none">{court.name}</p>
                                            <div className="w-full bg-secondary mt-2 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-[#ccff00] h-full transition-all duration-500"
                                                    style={{ width: court.percent }}
                                                />
                                            </div>
                                        </div>
                                        <div className="ml-auto font-medium text-sm min-w-[50px] text-right">
                                            {formatHours(court.hours)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No hay datos de reservas aún
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Financial Intelligence Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-full lg:col-span-3">
                    <TopSpenders />
                </div>
            </div>

            {/* Academy Hosting Requests Section */}
            {activeWorkspace && (
                <div className="mt-8">
                    <ClubHostingRequests clubId={activeWorkspace.entity_id} />
                </div>
            )}
        </div>
    )
}
