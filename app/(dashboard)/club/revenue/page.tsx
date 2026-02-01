"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Download, Loader2 } from "lucide-react"
import { SmartRevenueChart } from "@/components/club/dashboard/SmartRevenueChart"
import { Button } from "@/components/ui/button"
import { RevenueKPIs } from "@/components/club/revenue/RevenueKPIs"
import { RevenueBreakdown } from "@/components/club/revenue/RevenueBreakdown"
import { OccupancyHeatmap } from "@/components/club/revenue/OccupancyHeatmap"
import { TimeRangeSelector } from "@/components/club/revenue/TimeRangeSelector"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"

export default function ClubRevenuePage() {
    const { user, profile } = useAuth()
    const { toast } = useToast()
    const router = useRouter()

    // State
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState("this_month")
    const [dateAnchor, setDateAnchor] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date())
    })
    const [range, setRange] = useState({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })

    const [stats, setStats] = useState<any>({
        kpi: { totalRevenue: 0, revenueGrowth: 0, activeMembers: 0 },
        breakdown: { reservations: 0, recurring: 0 },
        chart: [],
        heatmap: []
    })

    // RBAC Security Check
    useEffect(() => {
        if (profile && profile.role === 'club_staff') {
            toast({
                variant: "destructive",
                title: "Acceso Restringido",
                description: "Solo los dueños pueden ver la información financiera."
            })
            router.push('/club/calendar')
        }
    }, [profile, router, toast])

    // Data Fetching
    const fetchData = async () => {
        if (!profile?.organization_id) return

        setLoading(true)
        try {
            const { data, error } = await supabase.rpc('get_dashboard_stats', {
                p_organization_id: profile.organization_id,
                p_start_date: range.start.toISOString(),
                p_end_date: range.end.toISOString()
            })

            if (error) throw error

            if (data) {
                setStats(data)
            }
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos financieros.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (profile?.organization_id) {
            fetchData()
        }
    }, [range, profile?.organization_id])

    // Transforms - now using database-calculated values
    const kpiData = {
        totalRevenue: stats.kpi.totalRevenue || 0,
        totalRevenueGrowth: stats.kpi.revenueGrowth || 0,
        averageTicket: stats.kpi.averageTicket || 0,
        averageTicketGrowth: stats.kpi.ticketGrowth || 0,
        activeClients: stats.kpi.activeClients || 0,
        activeClientsGrowth: stats.kpi.clientsGrowth || 0,
        occupancyRate: stats.kpi.occupancyRate || 0,
        occupancyRateGrowth: stats.kpi.occupancyGrowth || 0
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Inteligencia de Negocio</h1>
                    <p className="text-zinc-400">
                        Viendo: <span className="text-[#ccff00] font-medium">{format(range.start, "MMMM yyyy", { locale: es })}</span>
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <TimeRangeSelector
                        date={dateAnchor}
                        setDate={setDateAnchor}
                        period={period}
                        setPeriod={setPeriod}
                        onRangeChange={(start, end) => setRange({ start, end })}
                    />

                    <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800 text-zinc-300">
                        <Download className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#ccff00]" />
                </div>
            ) : (
                <>
                    {/* Level 1: KPIs */}
                    <RevenueKPIs data={kpiData} />

                    {/* Level 2: Main Chart & Breakdown */}
                    <div className="grid gap-4 md:grid-cols-7 h-[500px]">
                        <SmartRevenueChart
                            externalDateRange={{ from: range.start, to: range.end }}
                            hideControls={true}
                            title="Balance Diario"
                            description="Comportamiento de ingresos en el periodo seleccionado"
                        />

                        <div className="col-span-3 h-full">
                            <RevenueBreakdown data={stats.breakdown} />
                        </div>
                    </div>

                    {/* Level 3: Heatmap */}
                    <OccupancyHeatmap data={stats.heatmap} />
                </>
            )}
        </div>
    )
}
