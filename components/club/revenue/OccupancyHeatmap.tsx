"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

// Heatmap Data simulator or handler
// Heatmap Data simulator or handler
interface OccupancyHeatmapProps {
    data: {
        day: string | number
        hour: string | number
        value: number // 0-100 intensity
        revenue?: number
    }[]
}

export function OccupancyHeatmap({ data }: OccupancyHeatmapProps) {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    const hours = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']

    // Helper to get color based on intensity (Saturation %)
    const getColor = (value: number) => {
        if (value === 0) return 'bg-zinc-800/50'
        if (value < 30) return 'bg-[#ccff00]/20'  // Low Saturation (< 30%)
        if (value < 70) return 'bg-[#ccff00]/50' // Medium Saturation (30% - 70%)
        if (value < 90) return 'bg-[#ccff00]/80' // High Saturation (70% - 90%)
        return 'bg-[#ccff00]'                      // Prime / Max (> 90%)
    }

    return (
        <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-white">Mapa de Calor Financiero</CardTitle>
                <CardDescription className="text-zinc-400">
                    Horarios de mayor rentabilidad (Ocupación + Precio Dinámico)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                        {/* Header Row */}
                        <div className="flex">
                            <div className="w-12"></div>
                            {days.map(day => (
                                <div key={day} className="flex-1 text-center text-xs text-zinc-500 font-medium py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Rows */}
                        {hours.map((hour, hIndex) => (
                            <div key={hour} className="flex items-center h-8">
                                <div className="w-12 text-xs text-zinc-500 font-medium">{hour}</div>
                                {days.map((day, dIndex) => {
                                    // Match logic: Normalize data to match UI strings
                                    const cell = data.find(d => {
                                        // Normalize Day
                                        let dDay = d.day
                                        if (typeof d.day === 'number') {
                                            // Postgres DOW: 0=Sun, 1=Mon...
                                            // UI Array: 0=Mon, ... 6=Sun
                                            const dayIndex = (d.day === 0) ? 6 : d.day - 1
                                            dDay = days[dayIndex]
                                        }

                                        // Normalize Hour
                                        let dHour = d.hour
                                        if (typeof d.hour === 'number') {
                                            dHour = `${d.hour.toString().padStart(2, '0')}:00`
                                        }

                                        return dDay === day && dHour === hour
                                    })

                                    const cellValue = cell?.value || 0
                                    const cellRevenue = cell?.revenue || 0

                                    return (
                                        <div key={`${day}-${hour}`} className="flex-1 px-0.5 h-full">
                                            <div
                                                className={`w-full h-full rounded-sm transition-all hover:opacity-80 cursor-alias ${getColor(cellValue)}`}
                                                title={`${day} ${hour}: $${cellRevenue.toLocaleString()} (${Math.round(cellValue)}% Saturation)`}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-4 mt-6 text-xs text-zinc-500">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-zinc-800/50"></div>
                        <span>Inactivo</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#ccff00]/20"></div>
                        <span>Bajo</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#ccff00]/50"></div>
                        <span>Medio</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#ccff00]"></div>
                        <span>Alto (Prime)</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
