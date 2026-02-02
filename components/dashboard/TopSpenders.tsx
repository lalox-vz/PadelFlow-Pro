"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Trophy, DollarSign, CalendarDays, Loader2 } from "lucide-react"

export function TopSpenders() {
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTopSpenders = async () => {
            try {
                const { data } = await supabase
                    .from('club_members')
                    .select('id, full_name, total_bookings, total_spent, metadata')
                    .eq('entity_id', '70e8610d-2c9b-403f-bfd2-21a279251b1b')
                    .order('total_spent', { ascending: false })
                    .limit(5)

                if (data) setMembers(data)
            } catch (error) {
                console.error("Error fetching top spenders:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchTopSpenders()
    }, [])

    if (loading) {
        return (
            <Card className="h-full border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50 flex items-center justify-center min-h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </Card>
        )
    }

    return (
        <Card className="h-full border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
            <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Top Clientes (LTV)
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                            Mayores ingresos históricos
                        </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Live Data
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-4 px-4 pb-2">
                <div className="space-y-4">
                    {members && members.length > 0 ? (
                        members.map((member, index) => {
                            // Initials for avatar
                            const initials = member.full_name
                                ? member.full_name
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .substring(0, 2)
                                    .toUpperCase()
                                : "??"

                            // Medal colors
                            let medalColor = "text-zinc-400"
                            if (index === 0) medalColor = "text-yellow-500"
                            if (index === 1) medalColor = "text-zinc-400"
                            if (index === 2) medalColor = "text-amber-700"

                            const isTop3 = index < 3

                            return (
                                <div key={member.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <Avatar className="h-10 w-10 border border-zinc-100 dark:border-zinc-800">
                                                <AvatarFallback className={`text-xs font-bold ${index === 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-zinc-50 text-zinc-700'}`}>
                                                    {initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            {isTop3 && (
                                                <div className={`absolute -top-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-0.5 ${medalColor}`}>
                                                    <Trophy className="h-3 w-3 fill-current" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                                                {member.full_name}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1">
                                                    <CalendarDays className="h-3 w-3" />
                                                    {member.total_bookings} res
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end">
                                            <DollarSign className="h-3 w-3 mr-0.5" />
                                            {member.total_spent}
                                        </div>
                                        <span className="text-[10px] text-zinc-400 uppercase tracking-tighter">
                                            Total
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-8 text-sm text-zinc-500">
                            No hay datos de clientes aún.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
