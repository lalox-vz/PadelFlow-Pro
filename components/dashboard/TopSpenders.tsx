"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, DollarSign, CalendarDays, Loader2, MessageCircle, Phone, Sparkles, Users } from "lucide-react" // Added icons
import { Button } from "@/components/ui/button"

export interface ActiveClient {
    id: string
    full_name: string
    phone: string
    count: number
    spent: number
    lastDate: string
}

interface TopSpendersProps {
    clients: ActiveClient[]
    loading?: boolean
    totalActiveCount?: number
    onViewAll?: () => void
}

export function TopSpenders({ clients, loading, totalActiveCount, onViewAll }: TopSpendersProps) {
    // Sort by spent (LTV) just in case, though parent should handle it
    const topClients = [...clients].sort((a, b) => b.spent - a.spent).slice(0, 5)

    const handleWhatsApp = (phone: string, name: string) => {
        if (!phone) return
        let p = phone.replace(/\D/g, '')
        if (p.startsWith('0')) p = '58' + p.substring(1)
        if (!p.startsWith('58')) p = '58' + p
        const msg = `Hola ${name}, ¡gracias por jugar con nosotros! 🎾`
        window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    if (loading) {
        return (
            <Card className="h-full border-none shadow-xl bg-zinc-900/50 backdrop-blur-xl border-zinc-800/50 flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-[#ccff00]" />
            </Card>
        )
    }

    return (
        <Card className="h-full border-zinc-800 bg-zinc-900/40 backdrop-blur-md shadow-2xl overflow-hidden relative group">
            {/* Decorative Gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ccff00]/5 rounded-full blur-3xl group-hover:bg-[#ccff00]/10 transition-all" />

            <CardHeader className="pb-4 border-b border-white/5 relative z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                            <Trophy className="h-5 w-5 text-[#ccff00]" />
                            Top Clientes
                        </CardTitle>
                        <Button
                            variant="ghost"
                            className="p-0 h-auto text-zinc-400 mt-1 flex items-center gap-2 hover:text-white hover:bg-transparent transition-colors group/btn"
                            onClick={onViewAll}
                        >
                            <Users className="w-4 h-4" />
                            <span className="font-medium text-white group-hover/btn:underline decoration-[#ccff00] underline-offset-4">{totalActiveCount || clients.length}</span> Clientes Activos
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 px-4 pb-4 space-y-5 relative z-10">
                {topClients.length > 0 ? (
                    topClients.map((client, index) => {
                        const initials = client.full_name
                            ? client.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
                            : "??"

                        // Crown Logic
                        let rankIcon = <span className="text-xs font-bold text-zinc-600 font-mono">#{index + 1}</span>
                        if (index === 0) rankIcon = <Trophy className="h-4 w-4 text-[#ccff00] fill-[#ccff00]/20" />
                        if (index === 1) rankIcon = <Trophy className="h-4 w-4 text-zinc-300" />
                        if (index === 2) rankIcon = <Trophy className="h-4 w-4 text-amber-700" />

                        return (
                            <div key={client.id} className="flex items-center justify-between group/item hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 border-2 border-zinc-900 ring-2 ring-white/10">
                                            <AvatarFallback className={`text-xs font-bold ${index === 0 ? 'bg-[#ccff00] text-black' : 'bg-zinc-800 text-zinc-300'}`}>
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute -top-2 -left-2 bg-zinc-950 rounded-full p-1 border border-zinc-800">
                                            {rankIcon}
                                        </div>
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">
                                            {client.full_name}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                                            <span className="flex items-center gap-1 bg-zinc-800/50 px-1.5 py-0.5 rounded text-zinc-300">
                                                <CalendarDays className="h-3 w-3" />
                                                {client.count}
                                            </span>
                                            {client.phone && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleWhatsApp(client.phone, client.full_name) }}
                                                    className="hover:text-[#ccff00] transition-colors flex items-center gap-1 group/phone"
                                                    title="Contactar por WhatsApp"
                                                >
                                                    <MessageCircle className="h-3 w-3" />
                                                    <span className="text-[10px] hidden group-hover/phone:inline-block">{client.phone}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="text-sm font-bold text-[#ccff00] flex items-center justify-end">
                                        <DollarSign className="h-3.5 w-3.5" />
                                        {client.spent.toLocaleString('es-VE')}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-medium tracking-wider">LTV</span>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center py-10 text-zinc-500">
                        <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-20" />
                        <p>Aún no hay suficiente data</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function UsersIconMini() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.532-2.405 1.968 1.968 0 0 1 .74-1.616A8.003 8.003 0 0 1 18.835 5.328 3.844 3.844 0 0 1 19.5 9 3.844 3.844 0 0 1 15 12.844a4 4 0 0 1-5.074 4.584 6.004 6.004 0 0 1-8.311-1.002Z" />
        </svg>
    )
}
