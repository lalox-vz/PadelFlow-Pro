"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { format, subDays, getHours, parseISO, differenceInMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, TrendingUp, DollarSign, Clock, BarChart3, AlertCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts'
import { cn } from "@/lib/utils"

export function AnalyticsView() {
    const { profile } = useAuth()
    const [loading, setLoading] = useState(true)
    const [courts, setCourts] = useState<any[]>([])
    const [bookings, setBookings] = useState<any[]>([])

    // RBAC
    const orgId = profile?.organization_id

    useEffect(() => {
        if (orgId) fetchData()
    }, [orgId])

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Get Courts from SQL (Source of Truth)
            const { data: courtData, error: courtError } = await supabase
                .from('courts')
                .select('*')
                .eq('club_id', orgId)

            if (courtError) throw courtError

            const courtList = courtData || []

            // 2. Get Bookings (Last 30 days)
            const startDate = subDays(new Date(), 30).toISOString()

            const { data: bookingData, error: bookingError } = await supabase
                .from('bookings')
                .select('*')
                .eq('entity_id', orgId)
                .neq('status', 'cancelled')
                .gte('start_time', startDate)

            if (bookingError) {
                console.error("Error fetching bookings:", bookingError)
                throw bookingError
            }

            setCourts(courtList)
            setBookings(bookingData || [])
        } catch (e) {
            console.error("Analytics fetch error:", e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    // --- DATA PROCESSING ---

    // 1. Metrics per Court
    const courtMetrics = courts.map(court => {
        const courtBookings = bookings.filter(b => b.court_id === court.id)

        const totalRevenue = courtBookings.reduce((sum, b) => sum + (b.price || 0), 0)

        const totalMinutes = courtBookings.reduce((sum, b) => {
            const start = parseISO(b.start_time)
            const end = parseISO(b.end_time)
            return sum + differenceInMinutes(end, start)
        }, 0)
        const totalHours = Math.round(totalMinutes / 60 * 10) / 10

        return {
            name: court.name,
            id: court.id,
            revenue: totalRevenue,
            hours: totalHours,
            count: courtBookings.length
        }
    }).sort((a, b) => b.revenue - a.revenue) // Sort by revenue desc

    // 2. Hourly Heatmap Data
    const hoursData = Array.from({ length: 17 }, (_, i) => {
        const hour = i + 7 // Start at 7 AM
        return { hour: `${hour}:00`, count: 0, revenue: 0, hourNum: hour }
    })

    bookings.forEach(b => {
        const start = parseISO(b.start_time)
        const h = getHours(start)
        const hourIndex = h - 7
        if (hourIndex >= 0 && hourIndex < hoursData.length) {
            hoursData[hourIndex].count += 1
            hoursData[hourIndex].revenue += (b.price || 0)
        }
    })

    // Identify Low Occupancy (Valleys)
    const maxCount = Math.max(...hoursData.map(d => d.count))
    const valleyHours = hoursData.filter(d => d.count < (maxCount * 0.3) && d.count > 0).map(d => d.hour)

    const topCourt = courtMetrics[0]

    return (
        <div className="space-y-8 pb-10 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Ingresos Totales (30d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400">
                            ${courtMetrics.reduce((sum, c) => sum + c.revenue, 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Cancha Más Rentable</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white mb-1">{topCourt?.name || 'N/A'}</div>
                        <p className="text-xs text-zinc-500">
                            Generó ${topCourt?.revenue.toLocaleString()} ({topCourt?.hours} horas)
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Oportunidad (Horas Valle)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-amber-400 mb-1">
                            <Clock className="h-5 w-5" />
                            <span className="font-bold">
                                {valleyHours.length > 0 ? `${valleyHours[0]} - ${valleyHours[Math.min(valleyHours.length - 1, 3)]}` : 'N/A'}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Baja ocupación detectada. Ideal para promociones.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* 1. Comparison Chart */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Rendimiento por Cancha</CardTitle>
                        <CardDescription>Comparativa de horas reservadas e ingresos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={courtMetrics} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                    <XAxis type="number" stroke="#666" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        stroke="#999"
                                        width={100}
                                        tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    />
                                    <Bar dataKey="revenue" name="Ingresos ($)" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                    <Bar dataKey="hours" name="Horas" fill="#059669" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Occupancy Heatmap (Hourly) */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-white">Ocupación por Hora</CardTitle>
                        <CardDescription>Distribución de demanda diaria (Promedio).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={hoursData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="hour" stroke="#666" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                    <YAxis stroke="#666" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        name="Reservas"
                                        stroke="#f59e0b"
                                        fill="#f59e0b"
                                        fillOpacity={0.2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400 bg-zinc-950/50 p-3 rounded border border-zinc-800">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            <span>
                                Tip: Crea "Happy Hours" en las horas con curvas bajas para aumentar la ocupación.
                            </span>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
