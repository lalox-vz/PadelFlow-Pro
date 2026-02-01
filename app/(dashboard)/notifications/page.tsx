"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Bell, CheckCircle, XCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"

interface Notification {
    id: string
    type: string
    title: string
    message: string
    action_type: 'accept_decline' | 'view' | 'approve_deny' | 'none' | null
    action_url: string | null
    related_id: string | null
    related_type: string | null
    read: boolean
    actioned: boolean
    priority: 'low' | 'normal' | 'high' | 'critical'
    created_at: string
}

export default function NotificationsPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')

    const fetchNotifications = async () => {
        if (!user) return

        const query = supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (filter === 'unread') {
            query.eq('read', false)
        }

        const { data, error } = await query

        if (!error && data) {
            setNotifications(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchNotifications()
    }, [user, filter])

    const markAsRead = async (notificationId: string) => {
        await supabase.rpc('mark_notification_read', {
            p_notification_id: notificationId
        })
        fetchNotifications()
    }

    const markAllAsRead = async () => {
        await supabase.rpc('mark_all_notifications_read')
        fetchNotifications()
    }

    const handleAction = async (notification: Notification, action: 'accept' | 'decline' | 'view') => {
        if (action === 'view' && notification.action_url) {
            await markAsRead(notification.id)
            router.push(notification.action_url)
        } else if (action === 'accept' || action === 'decline') {
            const status = action === 'accept' ? 'approved' : 'declined'

            if (notification.related_type === 'hosting_request') {
                await supabase
                    .from('hosting_requests')
                    .update({ status, responded_by: user?.id, responded_at: new Date().toISOString() })
                    .eq('id', notification.related_id)
            } else if (notification.related_type === 'coach_invitation') {
                await supabase
                    .from('coach_invitations')
                    .update({ status: action === 'accept' ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
                    .eq('id', notification.related_id)
            } else if (notification.related_type === 'student_request') {
                await supabase
                    .from('student_requests')
                    .update({ status: action === 'accept' ? 'accepted' : 'declined', responded_at: new Date().toISOString() })
                    .eq('id', notification.related_id)
            }

            await markAsRead(notification.id)
            fetchNotifications()
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'destructive'
            case 'high': return 'default'
            case 'normal': return 'secondary'
            default: return 'outline'
        }
    }

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'critical': return 'Urgente'
            case 'high': return 'Alta'
            case 'normal': return 'Normal'
            default: return 'Baja'
        }
    }

    const unreadCount = notifications.filter(n => !n.read).length

    if (!user) {
        router.push('/login')
        return null
    }

    return (
        <div className="container max-w-4xl py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Bell className="h-8 w-8" />
                        Notificaciones
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <Button onClick={markAllAsRead} variant="outline">
                        Marcar todas como leídas
                    </Button>
                )}
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="all">
                        Todas ({notifications.length})
                    </TabsTrigger>
                    <TabsTrigger value="unread">
                        Sin leer ({unreadCount})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={filter} className="mt-6 space-y-4">
                    {loading ? (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                Cargando notificaciones...
                            </CardContent>
                        </Card>
                    ) : notifications.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-muted-foreground">
                                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>{filter === 'unread' ? 'No tienes notificaciones sin leer' : 'No tienes notificaciones'}</p>
                            </CardContent>
                        </Card>
                    ) : (
                        notifications.map((notification) => (
                            <Card key={notification.id} className={!notification.read ? 'border-blue-500 border-2' : ''}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CardTitle className="text-lg">{notification.title}</CardTitle>
                                                {!notification.read && (
                                                    <Badge variant="default">Nuevo</Badge>
                                                )}
                                                <Badge variant={getPriorityColor(notification.priority)}>
                                                    {getPriorityLabel(notification.priority)}
                                                </Badge>
                                            </div>
                                            <CardDescription>
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                                            </CardDescription>
                                        </div>
                                        {!notification.read && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => markAsRead(notification.id)}
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">{notification.message}</p>

                                    {/* Action Buttons */}
                                    {notification.action_type === 'accept_decline' && !notification.actioned && (
                                        <div className="flex gap-2">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                                                onClick={() => handleAction(notification, 'accept')}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Aceptar
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAction(notification, 'decline')}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Rechazar
                                            </Button>
                                        </div>
                                    )}

                                    {notification.action_type === 'view' && notification.action_url && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-[#ccff00] p-0"
                                            onClick={() => handleAction(notification, 'view')}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Ver detalles
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
