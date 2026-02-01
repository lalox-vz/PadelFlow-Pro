"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { UserProfile } from "@/types"
import { useLanguage } from "@/context/LanguageContext"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserWithStats extends UserProfile {
    total_bookings?: number
}

export default function AdminUsersPage() {
    const { t } = useLanguage()
    const [users, setUsers] = useState<UserWithStats[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'client'>('all')
    const [tierFilter, setTierFilter] = useState('all')
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
    const [grantingMembership, setGrantingMembership] = useState(false)

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*, registrations(count)')

        if (data) {
            const usersWithStats = data.map((user: any) => ({
                ...user,
                total_bookings: user.registrations ? user.registrations[0].count : 0
            }))
            usersWithStats.sort((a, b) => b.total_bookings - a.total_bookings)
            setUsers(usersWithStats)
        } else {
            console.error("Error fetching users:", error)
        }
        setLoading(false)
    }

    const getUserStatus = (bookings: number) => {
        if (bookings === 0) return { label: t.dashboard.users.status.new, color: 'bg-gray-100 text-gray-800' }
        if (bookings < 5) return { label: t.dashboard.users.status.occasional, color: 'bg-blue-100 text-blue-800' }
        return { label: t.dashboard.users.status.recurrent, color: 'bg-indigo-100 text-indigo-800' }
    }

    const deleteUser = async (userId: string) => {
        // First Confirmation
        if (!confirm(t.dashboard.users.delete_confirm || "¿Estás seguro de que quieres eliminar este usuario?")) return

        // Second Confirmation (Double Check)
        if (!confirm(t.dashboard.users.delete_confirm_final)) return

        setUpdatingUserId(userId)

        try {
            const response = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Unknown error')
            }

            // Update UI on success
            setUsers(users.filter(u => u.id !== userId))
        } catch (error: any) {
            console.error('Delete error:', error)
            alert(t.dashboard.users.errors.delete + error.message)
        } finally {
            setUpdatingUserId(null)
        }
    }

    const updateUserRole = async (userId: string, newRole: 'admin' | 'client') => {
        const confirmMsg = newRole === 'admin'
            ? t.dashboard.users.promote_confirm
            : t.dashboard.users.revoke_confirm

        if (!confirm(confirmMsg)) return

        setUpdatingUserId(userId)
        const { error } = await supabase.rpc('update_user_role', {
            target_user_id: userId,
            new_role: newRole
        })

        if (error) {
            alert(t.dashboard.users.errors.role + error.message)
        } else {
            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
        }
        setUpdatingUserId(null)
    }

    // History Modal State
    const [historyUser, setHistoryUser] = useState<any | null>(null)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [userHistory, setUserHistory] = useState<any[]>([])

    // Membership Modal State
    const [membershipUser, setMembershipUser] = useState<any | null>(null)
    const [selectedTier, setSelectedTier] = useState<string>('Basic')
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])

    const fetchUserHistory = async (userId: string) => {
        setHistoryLoading(true)
        const { data } = await supabase
            .from('registrations')
            .select('*, training:trainings(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })

        if (data) setUserHistory(data)
        setHistoryLoading(false)
    }

    const openHistory = (user: any) => {
        setHistoryUser(user)
        fetchUserHistory(user.id)
    }

    const openMembershipModal = (user: any) => {
        setMembershipUser(user)
        setSelectedTier(user.membership_tier || 'Basic')
        setPaymentDate(new Date().toISOString().split('T')[0])
    }

    const handleGrantMembership = async () => {
        if (!membershipUser) return

        setGrantingMembership(true)
        // Calculate expiration date: Payment Date + 1 Month
        const start = new Date(paymentDate)
        const expires = new Date(start)
        expires.setMonth(expires.getMonth() + 1)

        const { error } = await supabase.from('users').update({
            membership_tier: selectedTier,
            membership_expires_at: expires.toISOString()
        }).eq('id', membershipUser.id)

        if (error) {
            alert(t.dashboard.users.errors.membership + error.message)
        } else {
            setUsers(users.map(u => u.id === membershipUser.id ? {
                ...u,
                membership_tier: selectedTier as any,
                membership_expires_at: expires.toISOString()
            } : u))
            setMembershipUser(null)
        }
        setGrantingMembership(false)
    }

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch = (
            (user.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        const matchesRole = roleFilter === 'all' || user.role === roleFilter

        let matchesTier = true
        if (tierFilter !== 'all') {
            if (tierFilter === 'Not a Member') {
                matchesTier = !user.membership_tier
            } else {
                matchesTier = user.membership_tier === tierFilter
            }
        }

        return matchesSearch && matchesRole && matchesTier
    })

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 text-foreground">{t.dashboard.users.title}</h1>

            {/* Filters */}
            {/* Filters */}
            <div className="flex flex-col md:grid md:grid-cols-3 gap-4 mb-6 bg-card p-4 rounded-lg shadow-sm border border-border">
                <div className="col-span-1">
                    <label className="text-sm font-medium mb-1 block text-foreground">{t.dashboard.users.search_placeholder}</label>
                    <Input
                        placeholder="Name, Email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-background text-foreground"
                    />
                </div>
                <div className="col-span-1">
                    <label className="text-sm font-medium mb-1 block text-foreground">{t.dashboard.users.table.role}</label>
                    <Select value={roleFilter} onValueChange={(val: any) => setRoleFilter(val)}>
                        <SelectTrigger className="bg-background text-foreground"><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.dashboard.users.filter_all}</SelectItem>
                            <SelectItem value="admin">{t.dashboard.users.filter_admin}</SelectItem>
                            <SelectItem value="client">{t.dashboard.users.filter_client}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-1">
                    <label className="text-sm font-medium mb-1 block text-foreground">{t.dashboard.users.membership}</label>
                    <Select value={tierFilter} onValueChange={setTierFilter}>
                        <SelectTrigger className="bg-background text-foreground"><SelectValue placeholder="All" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="VIP">VIP</SelectItem>
                            <SelectItem value="Access">ACCESO</SelectItem>
                            <SelectItem value="Basic">BASIC</SelectItem>
                            <SelectItem value="Not a Member">Not a Member</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-card shadow overflow-hidden sm:rounded-lg border border-border">
                {loading ? (
                    <div className="p-10 text-center flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">{t.dashboard.client.loading}</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.users.table.name}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.users.table.role}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.users.table.bookings}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.users.membership}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.users.table.actions}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center text-sm text-muted-foreground">
                                                {t.dashboard.users.no_users}
                                            </td>
                                        </tr>
                                    ) : filteredUsers.map((user: any) => {
                                        return (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <div className="text-sm font-medium text-foreground">{user.full_name}</div>
                                                        <div className="text-xs text-muted-foreground">{user.email}</div>
                                                        {user.phone && <div className="text-xs text-muted-foreground/70">{user.phone}</div>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                                    {user.total_bookings || 0}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={() => openMembershipModal(user)}
                                                        className="bg-muted hover:bg-muted/80 text-foreground text-xs py-1 px-2 rounded inline-flex items-center"
                                                    >
                                                        {user.membership_tier ? user.membership_tier : t.dashboard.users.no_plan}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button onClick={() => openHistory(user)} className="text-indigo-600 hover:text-indigo-900 mr-4 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                        {t.dashboard.users.history}
                                                    </button>
                                                    {user.role === 'client' ? (
                                                        <button
                                                            onClick={() => updateUserRole(user.id, 'admin')}
                                                            className="text-green-600 hover:text-green-900 mr-4 disabled:opacity-50 flex items-center inline-flex dark:text-green-400 dark:hover:text-green-300"
                                                            disabled={updatingUserId === user.id}
                                                        >
                                                            {updatingUserId === user.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                            {t.dashboard.users.make_admin}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => updateUserRole(user.id, 'client')}
                                                            className="text-orange-600 hover:text-orange-900 mr-4 disabled:opacity-50 flex items-center inline-flex dark:text-orange-400 dark:hover:text-orange-300"
                                                            disabled={updatingUserId === user.id}
                                                        >
                                                            {updatingUserId === user.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                            {t.dashboard.users.revoke_admin}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteUser(user.id)}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50 flex items-center inline-flex dark:text-red-400 dark:hover:text-red-300"
                                                        disabled={updatingUserId === user.id}
                                                    >
                                                        {updatingUserId === user.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                        {t.dashboard.users.delete}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4 p-4">
                            {filteredUsers.length === 0 ? (
                                <div className="text-center text-muted-foreground py-4">{t.dashboard.users.no_users}</div>
                            ) : filteredUsers.map((user: any) => (
                                <div key={user.id} className="bg-card border border-border rounded-lg shadow-sm p-4 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-foreground">{user.full_name}</p>
                                            <p className="text-sm text-muted-foreground">{user.email}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                                            {user.role}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-muted-foreground">Plan:</span>
                                        <button
                                            onClick={() => openMembershipModal(user)}
                                            className="bg-muted hover:bg-muted/80 text-foreground text-xs py-1 px-2 rounded"
                                        >
                                            {user.membership_tier ? user.membership_tier : t.dashboard.users.no_plan}
                                        </button>
                                        <span className="text-muted-foreground/50">|</span>
                                        <span className="text-muted-foreground">{t.dashboard.users.table.bookings}: {user.total_bookings || 0}</span>
                                    </div>

                                    <div className="pt-3 border-t border-border flex flex-wrap gap-3">
                                        <button onClick={() => openHistory(user)} className="text-indigo-600 text-sm font-medium hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                                            {t.dashboard.users.history}
                                        </button>
                                        {user.role === 'client' ? (
                                            <button
                                                onClick={() => updateUserRole(user.id, 'admin')}
                                                className="text-green-600 text-sm font-medium hover:text-green-800 disabled:opacity-50 flex items-center dark:text-green-400 dark:hover:text-green-300"
                                                disabled={updatingUserId === user.id}
                                            >
                                                {updatingUserId === user.id && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                                {t.dashboard.users.make_admin}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateUserRole(user.id, 'client')}
                                                className="text-orange-600 text-sm font-medium hover:text-orange-800 disabled:opacity-50 flex items-center dark:text-orange-400 dark:hover:text-orange-300"
                                                disabled={updatingUserId === user.id}
                                            >
                                                {updatingUserId === user.id && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                                {t.dashboard.users.revoke_admin}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="text-red-600 text-sm font-medium hover:text-red-800 disabled:opacity-50 flex items-center ml-auto dark:text-red-400 dark:hover:text-red-300"
                                            disabled={updatingUserId === user.id}
                                        >
                                            {updatingUserId === user.id && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                            {t.dashboard.users.delete}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* History Modal */}
            {
                historyUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h2 className="text-lg font-bold">{t.dashboard.users.history_modal.title}: {historyUser.full_name}</h2>
                                <button onClick={() => setHistoryUser(null)} className="text-gray-500 hover:text-gray-700">&times;</button>
                            </div>
                            <div className="p-4 overflow-y-auto flex-1">
                                {historyLoading ? (
                                    <div className="flex justify-center p-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                    </div>
                                ) : userHistory.length === 0 ? (
                                    <p className="text-center text-gray-500">{t.dashboard.users.history_modal.no_history}</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {userHistory.map((rec) => (
                                            <li key={rec.id} className="border p-3 rounded bg-gray-50">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold">{rec.training?.title || t.dashboard.users.history_modal.unknown_training}</span>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${rec.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {rec.status}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {rec.training?.start_time ? new Date(rec.training.start_time).toLocaleString() : t.dashboard.users.history_modal.date_unknown}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="p-4 border-t bg-gray-50 text-right">
                                <button onClick={() => setHistoryUser(null)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">{t.dashboard.users.history_modal.close}</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Manual Membership Override Modal */}
            {membershipUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{t.dashboard.users.membership_modal.title}</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            {t.dashboard.users.membership_modal.description} <strong>{membershipUser.full_name}</strong>.
                            {t.dashboard.users.membership_modal.description_2}
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t.dashboard.users.membership_modal.tier_label}</label>
                                <select
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    value={selectedTier}
                                    onChange={(e) => setSelectedTier(e.target.value)}
                                >
                                    <option value="VIP">VIP (High Priority)</option>
                                    <option value="Access">ACCESO</option>
                                    <option value="Basic">BASIC</option>
                                    <option value="Not a Member">{t.dashboard.users.tiers.not_a_member}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">{t.dashboard.users.membership_modal.date_label}</label>
                                <Input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">{t.dashboard.users.membership_modal.expiration_note}</p>
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setMembershipUser(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                                {t.dashboard.users.membership_modal.cancel}
                            </button>
                            <button
                                onClick={handleGrantMembership}
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                                disabled={grantingMembership}
                            >
                                {grantingMembership && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.dashboard.users.membership_modal.saving}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
