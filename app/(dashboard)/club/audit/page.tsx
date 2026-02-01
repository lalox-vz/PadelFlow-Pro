"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react"

interface AuditReport {
    id: string
    created_at: string
    shift_date: string
    user: { full_name: string } | null
    cash_amount: number
    transfer_amount: number
    card_amount: number
    notes: string
    system_total: number
    declared_total: number
    difference: number
}

export default function AuditPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const [reports, setReports] = useState<AuditReport[]>([])
    const [loading, setLoading] = useState(true)

    const orgId = profile?.organization_id
    const isOwner = profile?.role === 'club_owner' || profile?.role === 'academy_owner'

    useEffect(() => {
        // Redirect if not owner
        if (!loading && profile && !isOwner) {
            router.push('/club/calendar')
        }
    }, [isOwner, loading, router, profile])

    useEffect(() => {
        if (orgId && isOwner) {
            fetchAuditData()
        }
    }, [orgId, isOwner])

    const fetchAuditData = async () => {
        setLoading(true)
        try {
            // 1. Fetch Reports
            const { data: reportsData, error: reportsError } = await supabase
                .from('shift_reports')
                .select(`
                    *,
                    user:users(full_name)
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(30)

            if (reportsError) throw reportsError

            // 2. Calculate details for each report
            const enhancedReports = await Promise.all((reportsData || []).map(async (report) => {
                const shiftDate = report.shift_date || report.created_at.split('T')[0]

                // Fetch bookings for this date
                const startOfDay = `${shiftDate}T00:00:00`
                const endOfDay = `${shiftDate}T23:59:59`

                // Try querying bookings. Use courts link if entity_id fails (fallback logic implicit if we wanted robust).
                // We trust entity_id exists based on Calendar Page.
                const { data: bookings, error: bookingsError } = await supabase
                    .from('bookings')
                    .select('price')
                    .eq('entity_id', orgId)
                    .eq('payment_status', 'paid')
                    .gte('start_time', startOfDay)
                    .lte('start_time', endOfDay)

                const systemTotal = bookings?.reduce((sum, b) => sum + (b.price || 0), 0) || 0
                const declaredTotal = (report.cash_amount || 0) + (report.transfer_amount || 0) + (report.card_amount || 0)
                const difference = declaredTotal - systemTotal

                return {
                    ...report,
                    system_total: systemTotal,
                    declared_total: declaredTotal,
                    difference
                }
            }))

            setReports(enhancedReports)

        } catch (error) {
            console.error("Error fetching audit:", error)
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Auditoría de Caja</h1>
                    <p className="text-zinc-400">Control de cierres de turno y discrepancias.</p>
                </div>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Historial de Cierres</CardTitle>
                    <CardDescription>
                        Comparativa entre el dinero declarado por el Staff y las reservas marcadas como 'Pagadas' en el sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-zinc-900">
                                <TableHead className="text-zinc-400 text-xs uppercase tracking-wider">Fecha</TableHead>
                                <TableHead className="text-zinc-400 text-xs uppercase tracking-wider">Responsable</TableHead>
                                <TableHead className="text-zinc-400 text-xs uppercase tracking-wider text-right">Declarado</TableHead>
                                <TableHead className="text-zinc-400 text-xs uppercase tracking-wider text-right">Sistema (Pagado)</TableHead>
                                <TableHead className="text-zinc-400 text-xs uppercase tracking-wider text-right">Diferencia</TableHead>
                                <TableHead className="text-zinc-400 text-xs uppercase tracking-wider">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                        No hay reportes de cierre registrados.
                                    </TableCell>
                                </TableRow>
                            ) : reports.map((report) => (
                                <TableRow key={report.id} className="border-zinc-800 hover:bg-zinc-800/50">
                                    <TableCell className="font-medium text-white">
                                        {format(new Date(report.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
                                    </TableCell>
                                    <TableCell className="text-zinc-300">
                                        {report.user?.full_name || 'Desconocido'}
                                    </TableCell>
                                    <TableCell className="text-right text-zinc-300">
                                        ${report.declared_total.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right text-zinc-300">
                                        ${report.system_total.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        <span className={report.difference < 0 ? "text-red-400" : report.difference > 0 ? "text-emerald-400" : "text-zinc-500"}>
                                            {report.difference > 0 ? '+' : ''}{report.difference.toFixed(2)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {Math.abs(report.difference) < 1 ? (
                                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Cuadra
                                            </Badge>
                                        ) : report.difference < 0 ? (
                                            <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20">
                                                <AlertTriangle className="w-3 h-3 mr-1" /> Faltante
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
                                                <TrendingUp className="w-3 h-3 mr-1" /> Sobrante
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
