"use client"

import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, DollarSign, Users, CreditCard, TrendingUp } from "lucide-react"

interface RevenueKPIsProps {
    data: {
        totalRevenue: number
        totalRevenueGrowth: number
        averageTicket: number
        averageTicketGrowth: number
        activeClients: number
        activeClientsGrowth: number
        occupancyRate: number
        occupancyRateGrowth: number
    }
}

export function RevenueKPIs({ data }: RevenueKPIsProps) {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(value)
    }

    const items = [
        {
            title: "Ingresos Totales",
            value: formatCurrency(data.totalRevenue),
            growth: data.totalRevenueGrowth,
            icon: DollarSign,
            color: "text-emerald-400"
        },
        {
            title: "Ticket Promedio",
            value: formatCurrency(data.averageTicket),
            growth: data.averageTicketGrowth,
            icon: CreditCard,
            color: "text-blue-400"
        },
        {
            title: "Clientes Activos",
            value: data.activeClients.toString(),
            growth: data.activeClientsGrowth,
            icon: Users,
            color: "text-purple-400"
        },
        {
            title: "Ocupación",
            value: `${data.occupancyRate}%`,
            growth: data.occupancyRateGrowth,
            icon: TrendingUp,
            color: "text-[#ccff00]"
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item, index) => (
                <Card key={index} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <p className="text-sm font-medium text-zinc-400">{item.title}</p>
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="text-2xl font-bold text-white">{item.value}</div>
                            <div className={`flex items-center text-xs ${item.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {item.growth >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                {Math.abs(item.growth).toFixed(1)}%
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">vs periodo anterior</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
