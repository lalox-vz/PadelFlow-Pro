"use client"

import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { cn, toLocalTime } from "@/lib/utils"
import { Loader2 } from "lucide-react"

interface MonthOverviewProps {
    date: Date
    bookings: any[]
    onDateSelect: (date: Date) => void
    isLoading?: boolean
    validCourtIds?: string[]
}

export function MonthOverview({ date, bookings, onDateSelect, isLoading, validCourtIds }: MonthOverviewProps) {
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

    // Metrics calculation
    const getDayMetrics = (day: Date) => {
        // Use local time for comparison to prevent "day hopping"
        let dayBookings = bookings.filter(b => isSameDay(toLocalTime(b.startTime), day))

        // Filter by valid courts if provided
        if (validCourtIds && validCourtIds.length > 0) {
            dayBookings = dayBookings.filter(b => validCourtIds.includes(b.courtId))
        }

        // DOUBLE-CHECK: Exclude canceled just in case page.tsx state hasn't flushed yet
        dayBookings = dayBookings.filter(b => b.paymentStatus !== 'canceled')

        const totalRevenue = dayBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)
        const count = dayBookings.length

        // Aggressive Contrast Scale
        let color = "bg-zinc-900 border-zinc-800"
        let textStyle = "text-zinc-600 font-medium"
        let revenueColor = "text-zinc-500"
        let badgeStyle = "bg-zinc-800 text-zinc-500 font-normal"

        if (count > 0) {
            color = "bg-emerald-950/40 border-emerald-900/50" // Subtle
            textStyle = "text-emerald-400/70"
            revenueColor = "text-emerald-400/60"
            badgeStyle = "bg-emerald-900/30 text-emerald-400/80"
        }
        if (count > 5) {
            color = "bg-emerald-800/80 border-emerald-600" // Mid
            textStyle = "text-white"
            revenueColor = "text-emerald-100"
            badgeStyle = "bg-black/20 text-white shadow-sm"
        }
        if (count > 15) {
            color = "bg-emerald-400 border-emerald-300 shadow-[0_0_25px_-5px_rgba(52,211,153,0.6)]" // High / Neon
            textStyle = "text-black font-black tracking-tight"
            revenueColor = "text-emerald-950 font-extrabold"
            badgeStyle = "bg-black/90 text-emerald-400 font-bold border border-emerald-300/20 shadow-lg"
        }

        return { count, totalRevenue, color, textStyle, revenueColor, badgeStyle }
    }

    return (
        <div className="grid grid-cols-7 gap-2 h-full min-h-[500px]">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="text-center text-xs font-bold text-zinc-600 uppercase py-3 tracking-widest">
                    {d}
                </div>
            ))}

            {days.map((day, i) => {
                const { count, totalRevenue, color, textStyle, revenueColor, badgeStyle } = getDayMetrics(day)
                return (
                    <button
                        key={day.toISOString()}
                        onClick={() => onDateSelect(day)}
                        style={i === 0 ? { gridColumnStart: day.getDay() || 7 } : undefined}
                        className={cn(
                            "group relative flex flex-col items-start justify-between p-3 rounded-lg border transition-all duration-300 hover:scale-[1.03] hover:z-10",
                            "h-32 text-left",
                            color,
                            isToday(day) ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-black z-10" : "",
                            !isSameMonth(day, date) && "opacity-20 grayscale hover:opacity-100 hover:grayscale-0"
                        )}
                    >
                        <span className={cn("text-2xl transition-colors", textStyle, isToday(day) && "text-blue-500 font-black")}>
                            {format(day, 'd')}
                        </span>

                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-zinc-600 self-center" />
                        ) : count > 0 ? (
                            <div className="w-full space-y-2">
                                <span className={cn("text-[10px] px-2 py-0.5 rounded-full inline-block backdrop-blur-sm", badgeStyle)}>
                                    {count} reservas
                                </span>
                                {totalRevenue > 0 && (
                                    <div className={cn("text-sm tracking-tight", revenueColor)}>
                                        ${totalRevenue.toLocaleString()}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span className="text-[10px] text-zinc-700 font-medium group-hover:text-zinc-500 transition-colors">--</span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
