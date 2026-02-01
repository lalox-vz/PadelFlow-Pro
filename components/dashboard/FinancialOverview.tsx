"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, ArrowUpRight, ArrowDownRight, DollarSign, Filter } from "lucide-react"
import { format, startOfMonth, subMonths, isSameMonth, parseISO, getMonth, getYear } from "date-fns"
import { es } from "date-fns/locale"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts"
import { ExchangeRateWidget } from "./ExchangeRateWidget"
import { AddTransactionModal } from "@/components/dashboard/AddTransactionModal"
import { FinancialRecordsTable } from "@/components/dashboard/FinancialRecordsTable"
import { useToast } from "@/hooks/use-toast" // Added Import

export default function FinancialOverview() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ revenue: 0, expenses: 0, net: 0 })
    const [chartData, setChartData] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [editingRecord, setEditingRecord] = useState<any>(null)
    const [filter, setFilter] = useState<'this_month' | 'last_month' | 'this_year'>('this_month')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const { toast } = useToast() // Added Hook

    useEffect(() => {
        let isMounted = true

        const fetchData = async () => {
            if (isMounted) await fetchFinancialData()
        }

        fetchData()

        const channel = supabase
            .channel('financial_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_records' }, () => {
                if (isMounted) fetchFinancialData()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
                if (isMounted) fetchFinancialData()
            })
            .subscribe()

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [filter])

    const fetchFinancialData = async () => {
        setLoading(true)
        console.log("DASHBOARD: Starting Data Fetch...")
        try {
            // Create a timeout promise that rejects after 20s (Extended)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => {
                    console.error("DASHBOARD: Timeout reached (20s)")
                    reject(new Error('TIMEOUT: Financial data fetch took too long'))
                }, 20000)
            )

            // Actual fetch logic wrapper
            const fetchData = async () => {
                // Optimize: Filter at DB level to prevent fetching entire history
                // We show chart for last 12 months, so fetch last 12-13 months max.
                const cutOffDate = new Date()
                cutOffDate.setFullYear(cutOffDate.getFullYear() - 1)
                cutOffDate.setMonth(cutOffDate.getMonth() - 1) // Buffer
                const cutOffISO = cutOffDate.toISOString()

                // 1. Fetch User Payments (Automatic Income)
                console.log("DASHBOARD: Fetching payments (from " + cutOffISO + ")...")
                const { data: payments, error: paymentError } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('status', 'approved')
                    .gte('created_at', cutOffISO) // Optimization

                if (paymentError) {
                    console.error("DASHBOARD: Payment fetch error", paymentError)
                    throw paymentError
                }
                console.log("DASHBOARD: Payments fetched", payments?.length)

                // 2. Fetch Manual Records
                console.log("DASHBOARD: Fetching records (from " + cutOffISO + ")...")
                const { data: records, error: recordsError } = await supabase
                    .from('financial_records')
                    .select('*')
                    .gte('date', cutOffISO) // Optimization
                    .order('date', { ascending: false })

                if (recordsError) {
                    console.error("DASHBOARD: Records fetch error", recordsError)
                    throw recordsError
                }
                console.log("DASHBOARD: Records fetched", records?.length)

                return { payments, records }
            }

            // Race the fetch against the timeout
            const result = await Promise.race([fetchData(), timeoutPromise]) as { payments: any[], records: any[] }

            // Process Data
            const { payments, records } = result

            // RLS CHECK
            if ((!payments || payments.length === 0) && (!records || records.length === 0)) {
                console.warn("DASHBOARD: No data found. This might be RLS blocking access or just empty DB.")
                toast({
                    title: "Possible Access Issue",
                    description: "No data returned. If you are Admin, check RLS policies.",
                    variant: "default" // Orange/Yellow if possible, else default
                })
            }

            calculateStats(payments || [], records || [])
            prepareChartData(payments || [], records || [])
            setTransactions(records || [])

        } catch (error: any) {
            console.error("Error fetching financial data:", error)
            toast({
                title: "Error fetching data",
                description: error.message || "Unknown error occurred",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
            console.log("DASHBOARD: Data fetch complete. Loading false.")
        }
    }

    const calculateStats = (payments: any[], records: any[]) => {
        let revenue = 0
        let expenses = 0

        const now = new Date()
        let startDate: Date
        let endDate: Date = now

        if (filter === 'this_month') {
            startDate = startOfMonth(now)
        } else if (filter === 'last_month') {
            startDate = startOfMonth(subMonths(now, 1))
            endDate = startOfMonth(now)
            // Actually, if it's last month, end needs to be end of last month. 
            // But simple check is "isInRange".
        } else {
            // This year
            startDate = new Date(now.getFullYear(), 0, 1)
        }

        const isInRange = (dateStr: string) => {
            const d = new Date(dateStr)
            if (filter === 'last_month') {
                return isSameMonth(d, subMonths(now, 1))
            }
            return d >= startDate && d <= endDate
        }

        // Sum User Payments (Income)
        payments.forEach(p => {
            // Use month_paid if available, else created_at
            const date = p.month_paid || p.created_at
            if (isInRange(date)) {
                revenue += Number(p.amount)
            }
        })

        // Sum Manual Records
        records.forEach(r => {
            if (isInRange(r.date)) {
                if (r.type === 'income') {
                    revenue += Number(r.amount)
                } else {
                    expenses += Number(r.amount)
                }
            }
        })

        setStats({
            revenue,
            expenses,
            net: revenue - expenses
        })
    }

    const prepareChartData = (payments: any[], records: any[]) => {
        // Group by month
        const monthlyData: Record<string, { income: number, expense: number }> = {}

        const monthsToProcess = 12 // Last 12 months? Or just all time? Prompt says "Jan, Feb, Mar..."
        // Let's do current year or last 6 months. Prompt implies a trend chart. 
        // "X-Axis: Months (Jan, Feb, Mar...)"

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = subMonths(new Date(), i)
            const key = format(d, 'MMM', { locale: es })
            // Ensure unique keys for month sorting? simpler to use 'yyyy-MM' for key then format for display
            // format 'MMM' might duplicate if > 1 year.
        }

        // Just aggregate all data by "Month Name" (assuming 1 year context) or 'yyyy-MM'
        const agg: Record<string, { income: number, expense: number, date: Date }> = {}

        // Helper
        const add = (dateStr: string, amount: number, type: 'income' | 'expense') => {
            const date = new Date(dateStr)
            const key = format(date, 'MMM', { locale: es }) // "ene", "feb"
            const sortKey = format(date, 'yyyy-MM')

            if (!agg[sortKey]) {
                agg[sortKey] = { income: 0, expense: 0, date }
            }
            if (type === 'income') agg[sortKey].income += Number(amount)
            else agg[sortKey].expense += Number(amount)
        }

        payments.forEach(p => add(p.month_paid || p.created_at, p.amount, 'income'))
        records.forEach(r => add(r.date, r.amount, r.type))

        // Convert to array and sort
        const chart = Object.values(agg)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(item => ({
                name: format(item.date, 'MMM', { locale: es }), // Axis label
                Ingresos: item.income,
                Gastos: item.expense
            }))

        // Take last 12 entries
        setChartData(chart.slice(-12))
    }

    const handleFilterChange = (val: string) => {
        setFilter(val as any)
    }

    return (
        <div className="space-y-6">
            <ExchangeRateWidget />
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ${stats.revenue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                            {filter.replace('_', ' ')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gastos Operativos</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            ${stats.expenses.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                            {filter.replace('_', ' ')}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
                        <DollarSign className={`h-4 w-4 ${stats.net >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${stats.net.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                            {filter.replace('_', ' ')}
                        </p>
                    </CardContent>
                </Card>
            </div>
            {/* Filter & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card p-4 rounded-lg ring-1 ring-border">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <select
                        className="bg-background border border-border rounded-md text-sm px-3 py-1 text-foreground w-full sm:w-auto"
                        value={filter}
                        onChange={(e) => handleFilterChange(e.target.value)}
                    >
                        <option value="this_month">Este Mes</option>
                        <option value="last_month">Mes Pasado</option>
                        <option value="this_year">Este Año</option>
                    </select>
                </div>
                <Button onClick={() => {
                    setEditingRecord(null)
                    setIsModalOpen(true)
                }} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Movimiento
                </Button>
            </div>

            {/* Cash Flow Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Flujo de Caja</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    formatter={(value) => `$${Number(value).toLocaleString()}`}
                                    contentStyle={{ borderRadius: '8px' }}
                                />
                                <Legend />
                                <Bar dataKey="Ingresos" fill="#166534" radius={[4, 4, 0, 0]} /> {/* Green-800 */}
                                <Bar dataKey="Gastos" fill="#991b1b" radius={[4, 4, 0, 0]} />   {/* Red-800 */}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Recent Transactions List */}
            <Card>
                <CardHeader>
                    <CardTitle>Transacciones Recientes (Manuales)</CardTitle>
                </CardHeader>
                <CardContent>
                    <FinancialRecordsTable
                        records={transactions}
                        onUpdate={fetchFinancialData}
                        onEdit={(record: any) => {
                            setEditingRecord(record)
                            setIsModalOpen(true)
                        }}
                    />
                </CardContent>
            </Card>

            <AddTransactionModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingRecord(null)
                }}
                onSuccess={fetchFinancialData}
                record={editingRecord}
            />
        </div>
    )
}
