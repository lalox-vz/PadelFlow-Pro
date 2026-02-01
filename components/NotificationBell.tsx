"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Bell } from 'lucide-react'
import { Button } from './ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover'
import { Badge } from './ui/badge'
import { useRouter } from 'next/navigation'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    action_type: 'accept_decline' | 'view' | 'none' | null
    action_url: string | null
    related_id: string | null
    related_type: string | null
    read: boolean
    priority: 'low' | 'normal' | 'high' | 'critical'
    created_at: string
}

export function NotificationBell() {
    const { user } = useAuth()
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(false)

    // Fetch notifications
    useEffect(() => {
        if (!user) return

        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (data) {
                setNotifications(data)
                setUnreadCount(data.filter(n => !n.read).length)
            }
        }

        fetchNotifications()

        // Subscribe to real-time updates
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    fetchNotifications()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user])

    const markAsRead = async (notificationId: string) => {
        await supabase.rpc('mark_notification_read', {
            p_notification_id: notificationId
        })

        setNotifications(prev =>
            prev.map(n =>
                n.id === notificationId ? { ...n, read: true } : n
            )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const handleAction = async (notification: Notification, action: 'accept' | 'decline' | 'view') => {
        setLoading(true)

        if (action === 'view' && notification.action_url) {
            await markAsRead(notification.id)
            router.push(notification.action_url)
        } else if (action === 'accept' || action === 'decline') {
            // Handle accept/decline for requests
            const status = action === 'accept' ? 'approved' : 'declined'

            if (notification.related_type === 'hosting_request') {
                await supabase
                    .from('hosting_requests')
                    .update({ status, responded_by: user?.id, responded_at: new Date().toISOString() })
                    .eq('id', notification.related_id)
            } else if (notification.related_type === 'coach_invitation') {
                await supabase
                    .from('coach_invitations')
                    .update({ status: action === 'accept' ? 'accepted' : ' declined', responded_at: new Date().toISOString() })
                    .eq('id', notification.related_id)
            } else if (notification.related_type === 'student_request') {
                await supabase
                    .from('student_requests')
                    .update({ status: action === 'accept' ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
                    .eq('id', notification.related_id)
            }

            await markAsRead(notification.id)
        }

        setLoading(false)
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-red-500'
            case 'high': return 'text-orange-500'
            case 'normal': return 'text-blue-500'
            default: return 'text-gray-500'
        }
    }

    if (!user) return null

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end">
                <div className="border-b px-4 py-3">
                    <h3 className="font-semibold">Notificaciones</h3>
                    {unreadCount > 0 && (
                        <p className="text-xs text-muted-foreground">{unreadCount} sin leer</p>
                    )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No tienes notificaciones</p>
                        </div>
                    ) : (
                        notifications.map(notification => (
                            <div
                                key={notification.id}
                                className={`border-b p-4 hover:bg-accent transition-colors ${!notification.read ? 'bg-accent/50' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <Bell className={`h-4 w-4 mt-1 ${getPriorityColor(notification.priority)}`} />
                                    <div className="flex-1 space-y-1">
                                        <p className="font-medium text-sm">{notification.title}</p>
                                        <p className="text-xs text-muted-foreground">{notification.message}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(notification.created_at).toLocaleDateString('es-VE', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>

                                        {/* Action Buttons */}
                                        {notification.action_type === 'accept_decline' && !notification.read && (
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                                                    onClick={() => handleAction(notification, 'accept')}
                                                    disabled={loading}
                                                >
                                                    Aceptar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAction(notification, 'decline')}
                                                    disabled={loading}
                                                >
                                                    Rechazar
                                                </Button>
                                            </div>
                                        )}

                                        {notification.action_type === 'view' && notification.action_url && (
                                            <Button
                                                size="sm"
                                                variant="link"
                                                className="p-0 h-auto text-[#ccff00]"
                                                onClick={() => handleAction(notification, 'view')}
                                            >
                                                Ver detalles →
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
