"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface RevenueBreakdownProps {
    data: {
        reservations: number
        recurring: number
    }
}

export function RevenueBreakdown({ data }: RevenueBreakdownProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)
    }

    const chartData = [
        { name: 'Reservas Casuales', value: data.reservations, color: '#ccff00' },
        { name: 'Socios Fijos', value: data.recurring, color: '#3b82f6' },
    ]

    const total = data.reservations + data.recurring

    return (
        <Card className="bg-zinc-900 border-zinc-800 h-full">
            <CardHeader>
                <CardTitle className="text-white">Origen de Ingresos</CardTitle>
                <CardDescription className="text-zinc-400">Distribución por tipo de servicio</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value) => [formatCurrency(value as number || 0), 'Ingresos']}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value, entry: any) => <span className="text-zinc-300 ml-2">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                        <div className="text-2xl font-bold text-white">{formatCurrency(total)}</div>
                        <div className="text-xs text-zinc-500">Total</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
