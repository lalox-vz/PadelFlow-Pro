"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Users, Calendar, CheckCircle, Search, ArrowRight } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { Input } from "@/components/ui/input"
import Link from "next/link"



export default function AdminDashboard() {
    const { t } = useLanguage()
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeClasses: 0,
        totalBookings: 0,
    })

    const [upcomingTrainings, setUpcomingTrainings] = useState<any[]>([])
    const [recentBookings, setRecentBookings] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    // New state for expandable list
    const [expandedTrainingId, setExpandedTrainingId] = useState<string | null>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [loadingParticipants, setLoadingParticipants] = useState(false)

    useEffect(() => {
        fetchStats()
        fetchRecentActivity()
    }, [])

    const handleToggleParticipants = async (trainingId: string) => {
        if (expandedTrainingId === trainingId) {
            setExpandedTrainingId(null)
            setParticipants([])
            return
        }

        setExpandedTrainingId(trainingId)
        setLoadingParticipants(true)

        const { data } = await supabase
            .from('registrations')
            .select('*, user:users(full_name, email)')
            .eq('training_id', trainingId)
            .eq('status', 'confirmed')

        if (data) setParticipants(data)
        setLoadingParticipants(false)
    }

    const fetchStats = async () => {
        const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true })
        const { count: trainingCount } = await supabase.from('trainings').select('*', { count: 'exact', head: true }).gte('start_time', new Date().toISOString())
        const { count: bookingCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('status', 'confirmed')

        setStats({
            totalUsers: userCount || 0,
            activeClasses: trainingCount || 0,
            totalBookings: bookingCount || 0,
        })
    }

    const fetchRecentActivity = async () => {
        // Fetch upcoming trainings
        const { data: trainings } = await supabase
            .from('trainings')
            .select('*, registrations(count)')
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
            .limit(5)

        if (trainings) setUpcomingTrainings(trainings)

        // Fetch recent bookings
        const { data: bookings } = await supabase
            .from('registrations')
            .select('*, user:users(full_name, email), training:trainings(title, start_time)')
            .order('created_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(20)

        if (bookings) setRecentBookings(bookings)
    }

    // Filter Logic
    const filteredTrainings = upcomingTrainings.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.instructor || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredBookings = recentBookings.filter(item =>
        (item.user?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.training?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">{t.dashboard.admin.overview}</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-card overflow-hidden shadow-sm rounded-lg border border-border hover:shadow-md transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.admin.total_users}</dt>
                                    <dd className="text-lg font-medium text-foreground">{stats.totalUsers}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-muted/50 px-5 py-3">
                        <div className="text-sm">
                            <Link href="/admin/users" className="font-medium text-indigo-600 hover:text-indigo-500 flex items-center">
                                {t.dashboard.admin.view_all} <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-card overflow-hidden shadow-sm rounded-lg border border-border hover:shadow-md transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <Calendar className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.admin.upcoming_trainings}</dt>
                                    <dd className="text-lg font-medium text-foreground">{stats.activeClasses}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-muted/50 px-5 py-3">
                        <div className="text-sm">
                            <Link href="/admin/trainings" className="font-medium text-indigo-600 hover:text-indigo-500 flex items-center">
                                {t.dashboard.admin.view_schedule} <ArrowRight className="ml-1 h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-card overflow-hidden shadow-sm rounded-lg border border-border hover:shadow-md transition-shadow">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <CheckCircle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-muted-foreground truncate">{t.dashboard.admin.total_bookings}</dt>
                                    <dd className="text-lg font-medium text-foreground">{stats.totalBookings}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t.dashboard.users.search_placeholder.replace('users', 'activity')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Detailed Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Upcoming Trainings */}
                <div className="bg-card shadow-sm rounded-lg overflow-hidden border border-border">
                    <div className="px-5 py-4 border-b border-border">
                        <h3 className="text-lg font-medium leading-6 text-foreground">{t.dashboard.admin.upcoming_trainings}</h3>
                    </div>
                    <ul className="divide-y divide-border">
                        {filteredTrainings.length === 0 ? (
                            <li className="px-5 py-4 text-center text-muted-foreground text-sm">{t.calendar.no_trainings}</li>
                        ) : filteredTrainings.map((training) => (
                            <li key={training.id} className="block hover:bg-accent transition">
                                <div
                                    className="px-5 py-4 cursor-pointer"
                                    onClick={() => handleToggleParticipants(training.id)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{training.title}</p>
                                            <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                                                {new Date(training.start_time).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
                                                {training.registrations ? training.registrations[0].count : 0} / {training.capacity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {expandedTrainingId === training.id && (
                                    <div className="px-5 py-3 bg-muted/30 border-t border-border">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Participants</h4>
                                        {loadingParticipants ? (
                                            <p className="text-xs text-muted-foreground">Loading...</p>
                                        ) : participants.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No participants yet.</p>
                                        ) : (
                                            <ul className="space-y-1">
                                                {participants.map((p: any) => (
                                                    <li key={p.id} className="text-xs text-foreground flex justify-between">
                                                        <span>{p.user?.full_name || 'Unknown'}</span>
                                                        <span className="text-muted-foreground">{p.user?.email}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Recent Bookings */}
                <div className="bg-card shadow-sm rounded-lg overflow-hidden border border-border">
                    <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                        <h3 className="text-lg font-medium leading-6 text-foreground">{t.dashboard.admin.recent_bookings}</h3>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Last 20</span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                        <ul className="divide-y divide-border">
                            {filteredBookings.length === 0 ? (
                                <li className="px-5 py-4 text-center text-muted-foreground text-sm">{t.dashboard.notifications.empty}</li>
                            ) : filteredBookings.map((booking) => (
                                <li key={booking.id} className="px-5 py-4 hover:bg-accent transition">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{booking.user?.full_name || 'Unknown User'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                booked {booking.training?.title || 'Class'}
                                            </p>
                                        </div>
                                        <div className="text-xs text-muted-foreground/70" suppressHydrationWarning>
                                            {new Date(booking.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}

