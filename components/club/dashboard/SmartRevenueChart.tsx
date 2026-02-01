"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { DateRange } from "react-day-picker"
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, isSameDay, isSameMonth, startOfYear, endOfYear } from "date-fns"
import { es } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn, toLocalTime } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"

interface ChartDataPoint {
    name: string
    total: number
    date: Date
}

interface SmartRevenueChartProps {
    /** If provided, uses external date range instead of internal state */
    externalDateRange?: { from: Date; to: Date }
    /** If true, hides the internal date picker (use when controlled externally) */
    hideControls?: boolean
    /** Custom title */
    title?: string
    /** Custom description (will be auto-generated if not provided) */
    description?: string
}

export function SmartRevenueChart({
    externalDateRange,
    hideControls = false,
    title = "Balance de Ingresos",
    description
}: SmartRevenueChartProps = {}) {
    const { profile } = useAuth()
    const [internalDateRange, setInternalDateRange] = useState<DateRange | undefined>({
        from: startOfYear(new Date()),
        to: endOfYear(new Date())
    })
    const [data, setData] = useState<ChartDataPoint[]>([])
    const [loading, setLoading] = useState(false)
    const [granularity, setGranularity] = useState<'day' | 'month'>('day')

    // Use external range if provided, otherwise use internal state
    const dateRange = externalDateRange
        ? { from: externalDateRange.from, to: externalDateRange.to }
        : internalDateRange
    const setDateRange = externalDateRange ? undefined : setInternalDateRange

    const orgId = profile?.organization_id

    // Extract timestamp primitives for stable dependency comparison
    const fromTimestamp = dateRange?.from?.getTime()
    const toTimestamp = dateRange?.to?.getTime()

    useEffect(() => {
        if (orgId && fromTimestamp && toTimestamp) {
            fetchRevenueData()
        }
    }, [orgId, fromTimestamp, toTimestamp])

    const fetchRevenueData = async () => {
        if (!dateRange?.from || !dateRange?.to || !orgId) return

        setLoading(true)
        try {
            // 1. Fetch Active Courts (to exclude ghost/invalid bookings and match Calendar)
            const { data: courts } = await supabase
                .from('courts')
                .select('id')
                .eq('club_id', orgId)
                .eq('is_active', true)

            const validCourtIds = courts?.map(c => c.id) || []

            // 2. Determine Granularity Based on Date Range
            // Professional 2-Tier System (like Stripe, Square, Shopify):
            // - ≤60 days (~2 months): Show DAILY bars - granular view for recent activity
            // - >60 days: Show MONTHLY bars - high-level trend view
            // Note: We skip weekly aggregation as "Sem 44, Sem 45" is confusing for business owners
            const daysDiff = Math.abs(differenceInDays(dateRange.to, dateRange.from)) + 1
            let period: 'day' | 'month' = 'day'

            if (daysDiff > 60) {
                // More than 2 months: Monthly view for clear trend analysis
                period = 'month'
                console.log(`[SmartRevenueChart] MONTHLY view. Days: ${daysDiff}`)
            } else {
                // Up to 2 months: Daily view for detailed analysis
                period = 'day'
                console.log(`[SmartRevenueChart] DAILY view. Days: ${daysDiff}`)
            }

            setGranularity(period)

            // 3. Fetch Data
            // Adjust fetch range to cover full month intervals when in monthly view
            const fetchStart = period === 'month' ? startOfMonth(dateRange.from) : dateRange.from
            const fetchEnd = period === 'month' ? endOfMonth(dateRange.to) : dateRange.to

            let query = supabase
                .from('bookings')
                .select('total_price, start_time, court_id')
                .eq('entity_id', orgId)
                .gte('start_time', fetchStart.toISOString())
                .lte('start_time', fetchEnd.toISOString())
                .neq('payment_status', 'canceled')

            // Apply Court Filter
            if (validCourtIds.length > 0) {
                query = query.in('court_id', validCourtIds)
            }

            const { data: bookings, error } = await query

            if (error) throw error

            // Aggregation Logic (Client-side)
            const aggregated: ChartDataPoint[] = []

            if (period === 'day') {
                // Daily aggregation: One bar per day
                const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
                days.forEach(day => {
                    const total = (bookings || []).filter(b => isSameDay(toLocalTime(b.start_time), day))
                        .reduce((sum, b) => sum + (b.total_price || 0), 0)
                    aggregated.push({
                        name: format(day, 'd', { locale: es }),
                        total,
                        date: day
                    })
                })
            } else {
                // Monthly aggregation: One bar per month
                const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to })
                months.forEach(monthStart => {
                    const total = (bookings || []).filter(b => isSameMonth(toLocalTime(b.start_time), monthStart))
                        .reduce((sum, b) => sum + (b.total_price || 0), 0)
                    aggregated.push({
                        name: format(monthStart, 'MMM yyyy', { locale: es }),
                        total,
                        date: monthStart
                    })
                })
            }

            setData(aggregated)

        } catch (error) {
            console.error("Error fetching revenue:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="col-span-4 transition-all duration-300 bg-zinc-900 border-zinc-800 h-full">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-white">{title}</CardTitle>
                        <CardDescription className="text-zinc-400">
                            {description || `Visualización ${granularity === 'day' ? 'Diaria' : 'Mensual'}`}
                        </CardDescription>
                    </div>
                    {!hideControls && setDateRange && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[260px] justify-start text-left font-normal bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                                                {format(dateRange.to, "LLL dd, y", { locale: es })}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y", { locale: es })
                                        )
                                    ) : (
                                        <span>Seleccionar periodo</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-zinc-950 border-zinc-800" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                    className="bg-zinc-950 text-white"
                                />
                            </PopoverContent>
                        </Popover>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pl-2 h-[400px]">
                <div className="h-full w-full">
                    {loading ? (
                        <div className="h-full w-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#f3f4f6', borderRadius: '8px' }}
                                    formatter={(value: any) => [new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value), 'Ingresos']}
                                />
                                <Bar
                                    dataKey="total"
                                    name="Ingresos"
                                    fill="url(#colorIncome)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ccff00" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ccff00" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
