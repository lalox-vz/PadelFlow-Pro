"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, MapPin, ChevronRight, History } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

export default function PlayerClassesPage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [upcomingClasses, setUpcomingClasses] = useState<any[]>([])
    const [pastClasses, setPastClasses] = useState<any[]>([])

    useEffect(() => {
        if (user) {
            fetchClasses()
        }
    }, [user])

    const fetchClasses = async () => {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .select(`
                    id,
                    status,
                    training:trainings(
                        id,
                        title,
                        start_time,
                        end_time,
                        instructor,
                        location
                    )
                `)
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            const now = new Date()
            const upcoming = []
            const past = []

            // Process and split
            for (const reg of data || []) {
                const trainingData = Array.isArray(reg.training) ? reg.training[0] : reg.training
                if (!trainingData) continue

                const startDate = new Date(trainingData.start_time)
                const item = {
                    ...reg,
                    training: trainingData,
                    dateStr: format(startDate, "d MMM, yyyy", { locale: es }),
                    timeStr: `${format(startDate, "HH:mm")} - ${format(new Date(trainingData.end_time), "HH:mm")}`,
                }

                if (startDate < now) {
                    past.push(item)
                } else {
                    upcoming.push(item)
                }
            }

            setUpcomingClasses(upcoming)
            setPastClasses(past)

        } catch (error) {
            console.error("Error fetching classes:", error)
            toast({
                title: "Error",
                description: "No se pudieron cargar tus clases.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Mis Clases</h1>
                    <p className="text-muted-foreground mt-1">Gestiona tu asistencia a programas y entrenamientos.</p>
                </div>
                <Link href="/player/explore">
                    <Button className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-semibold">
                        + Unirse a Clase
                    </Button>
                </Link>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
                    <TabsTrigger value="upcoming">Próximas</TabsTrigger>
                    <TabsTrigger value="history">Historial</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming" className="mt-6 space-y-4">
                    {loading ? (
                        <div className="text-center py-10">Cargando...</div>
                    ) : upcomingClasses.length > 0 ? (
                        upcomingClasses.map((item) => (
                            <div key={item.id} className="group relative flex flex-col sm:flex-row bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                                <div className="p-5 flex-1 flex flex-col sm:flex-row gap-4 sm:items-center">
                                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <CalendarDays className="h-6 w-6 text-blue-500" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg text-foreground">{item.training.title}</h3>
                                            <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-wider border border-blue-500/20">
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:gap-6 text-sm text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {item.dateStr}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                {item.timeStr}
                                            </span>
                                            {item.training.instructor && (
                                                <span className="flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {item.training.instructor}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-4 sm:pt-0 sm:border-l sm:pl-6 border-t sm:border-t-0 border-border">
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                            <ChevronRight className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-muted/30 rounded-xl border border-dashed border-border">
                            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium text-foreground">No tienes clases próximas</h3>
                            <Link href="/player/explore" className="mt-4 inline-block">
                                <Button>Ver Clases Disponibles</Button>
                            </Link>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="mt-6 space-y-4">
                    {pastClasses.map((item) => (
                        <div key={item.id} className="flex flex-col sm:flex-row bg-card/50 border border-border rounded-xl p-5 gap-4 items-center opacity-80 hover:opacity-100 transition-opacity">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 grayscale">
                                <History className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-foreground">{item.training.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.dateStr} • {item.training.location || 'Club'}</p>
                            </div>
                            <div className="text-sm font-medium text-muted-foreground uppercase">
                                {item.status}
                            </div>
                        </div>
                    ))}
                </TabsContent>
            </Tabs>
        </div>
    )
}
