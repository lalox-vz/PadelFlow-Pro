"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from "recharts"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, parseISO, getHours } from "date-fns"

import { useLanguage } from "@/context/LanguageContext"

export default function AnalyticsPage() {
    const { t } = useLanguage()
    const [payments, setPayments] = useState<any[]>([])
    const [trainings, setTrainings] = useState<any[]>([])
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [methodFilter, setMethodFilter] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)

        // Fetch Payments
        const { data: paymentsData } = await supabase
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false })

        const { data: usersData } = await supabase
            .from('users')
            .select('*, registrations(count)')

        // Fetch Trainings with counts
        const { data: trainingsData } = await supabase
            .from('trainings')
            .select('*, registrations(count)')

        if (paymentsData) setPayments(paymentsData)
        if (usersData) setUsers(usersData)
        if (trainingsData) setTrainings(trainingsData.map((t: any) => ({
            ...t,
            count: t.registrations ? t.registrations[0].count : 0
        })))

        setLoading(false)
    }

    // --- Data Processing ---

    // 1. Revenue History


    // 2. Class Popularity
    const getClassPopularityData = () => {
        const grouped = trainings.reduce((acc: any, curr: any) => {
            const type = curr.type
            acc[type] = (acc[type] || 0) + (curr.count || 0)
            return acc
        }, {})

        return Object.keys(grouped).map(k => ({
            name: k,
            attendees: grouped[k]
        }))
    }

    // 3. Peak Hours
    const getPeakHoursData = () => {
        const hours = Array(24).fill(0)
        trainings.forEach((t: any) => {
            const hour = getHours(parseISO(t.start_time))
            hours[hour] += (t.count || 0)
        })

        // Filter to showing reasonable hours (e.g. 5am to 10pm) or just non-zero
        return hours.map((count, hour) => ({
            name: `${hour}:00`,
            attendees: count
        })).filter(h => h.attendees > 0)
    }

    // 4. Loyal Users (Top 5 by payments count approx or join time)
    // Actually using total payments from the fetched payments array linked to user
    const getLoyalUsers = () => {
        // Group payments by user_id
        const payCounts = payments.reduce((acc: any, curr: any) => {
            acc[curr.user_id] = (acc[curr.user_id] || 0) + 1
            return acc
        }, {})

        return users
            .map(u => ({
                ...u,
                payment_count: payCounts[u.id] || 0
            }))
            .sort((a, b) => b.payment_count - a.payment_count)
            .slice(0, 10)
    }

    const filteredPayments = payments.filter(payment => {
        const user = users.find(u => u.id === payment.user_id)
        const term = searchTerm.toLowerCase()

        // Search
        const matchesSearch = (
            (payment.method || '').toLowerCase().includes(term) ||
            payment.amount.toString().includes(term) ||
            (payment.status || '').toLowerCase().includes(term) ||
            (user?.full_name || '').toLowerCase().includes(term) ||
            (user?.email || '').toLowerCase().includes(term)
        )

        // Status
        const matchesStatus = statusFilter === 'all' || payment.status === statusFilter

        // Method
        const matchesMethod = methodFilter === 'all' || payment.method === methodFilter

        // Date
        let matchesDate = true
        if (startDate) {
            matchesDate = matchesDate && new Date(payment.created_at) >= new Date(startDate)
        }
        if (endDate) {
            const end = new Date(endDate)
            end.setDate(end.getDate() + 1)
            matchesDate = matchesDate && new Date(payment.created_at) < end
        }

        return matchesSearch && matchesStatus && matchesMethod && matchesDate
    })

    if (loading) return <div className="p-10">Cargando...</div>

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-8 pb-10">
            <h1 className="text-3xl font-bold text-foreground">Panel de Análisis</h1>

            {/* Charts Row 1 */}
            <div className="bg-card p-6 rounded-lg shadow border border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Popularidad de Clases</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={getClassPopularityData()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="attendees"
                            >
                                {getClassPopularityData().map((entry: any, index: number) => {
                                    // Branding Color Map
                                    const name = entry.name.toLowerCase()
                                    let color = '#8884d8' // Default purple-ish

                                    if (name.includes('functional') || name.includes('funcional')) color = '#3b82f6' // Blue-500
                                    else if (name.includes('yoga')) color = '#a855f7' // Purple-500
                                    else if (name.includes('crossfit') || name.includes('pesas')) color = '#f97316' // Orange-500
                                    else if (name.includes('zumba') || name.includes('baile')) color = '#ec4899' // Pink-500
                                    else if (name.includes('custom') || name.includes('personal')) color = '#ef4444' // Red-500
                                    else if (name.includes('pilates')) color = '#10b981' // Emerald-500

                                    return <Cell key={`cell-${index}`} fill={color} />
                                })}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                itemStyle={{ color: 'var(--foreground)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>


            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-lg shadow border border-border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Horas Pico</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={getPeakHoursData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                                <XAxis dataKey="name" stroke="#A3A3A3" tick={{ fill: '#A3A3A3' }} />
                                <YAxis stroke="#A3A3A3" tick={{ fill: '#A3A3A3' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                    itemStyle={{ color: '#EAB308' }}
                                    cursor={{ stroke: '#EAB308' }}
                                />
                                <Line type="monotone" dataKey="attendees" stroke="#EAB308" strokeWidth={2} dot={{ r: 4, fill: '#EAB308' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-lg shadow border border-border">
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Miembros Más Leales</h3>
                    <div className="overflow-y-auto max-h-64">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Nombre</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Pagos</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Unido</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {getLoyalUsers().map(u => (
                                    <tr key={u.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-foreground">{u.full_name || u.email}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">{u.payment_count}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Payment Ledger */}
            <div className="bg-card p-6 rounded-lg shadow border border-border">
                <h3 className="text-lg font-semibold mb-4 text-foreground">Historial de Pagos</h3>

                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block text-foreground">Buscar</label>
                        <Input
                            placeholder="Nombre, Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-background text-foreground"
                        />
                    </div>
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block text-foreground">Estado</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-background text-foreground"><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="approved">Aprobado</SelectItem>
                                <SelectItem value="rejected">Rechazado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block text-foreground">Método</label>
                        <Select value={methodFilter} onValueChange={setMethodFilter}>
                            <SelectTrigger className="bg-background text-foreground"><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Zelle">Zelle</SelectItem>
                                <SelectItem value="PagoMovil">Pago Móvil</SelectItem>
                                <SelectItem value="Facebank">Facebank</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block text-foreground">Desde</label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background text-foreground" />
                    </div>
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block text-foreground">Hasta</label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background text-foreground" />
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Método</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {filteredPayments.map((payment) => {
                                const user = users.find(u => u.id === payment.user_id)
                                return (
                                    <tr key={payment.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {format(parseISO(payment.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                                            {user ? (user.full_name || user.email) : 'Usuario Desconocido'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {payment.method}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                            ${payment.amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                payment.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                }`}>
                                                {payment.status === 'pending' ? 'Pendiente' :
                                                    payment.status === 'approved' ? 'Aprobado' :
                                                        payment.status === 'rejected' ? 'Rechazado' : payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {filteredPayments.map((payment) => {
                        const user = users.find(u => u.id === payment.user_id)
                        return (
                            <div key={payment.id} className="p-4 bg-card border border-border rounded-lg shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-semibold text-foreground">{user ? (user.full_name || user.email) : 'Usuario Desconocido'}</p>
                                        <p className="text-xs text-muted-foreground">{format(parseISO(payment.created_at), 'MMM d, yyyy')}</p>
                                    </div>
                                    <span className="font-bold text-foreground">${payment.amount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">{payment.method}</span>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        payment.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        }`}>
                                        {payment.status === 'pending' ? 'Pendiente' :
                                            payment.status === 'approved' ? 'Aprobado' :
                                                payment.status === 'rejected' ? 'Rechazado' : payment.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {filteredPayments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        No se encontraron pagos con los filtros actuales.
                    </div>
                )}
            </div>
        </div >
    )
}
