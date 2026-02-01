"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Bell, Check, Trash2, Trash, MailOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface Notification {
    id: string
    message: string
    sent_at: string
    read: boolean
    type: string
}

export default function ClientNotificationsPage() {
    const { t } = useLanguage()
    const { user } = useAuth()
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) fetchNotifications()
    }, [user])

    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user!.id)
            .order('sent_at', { ascending: false })

        if (data) setNotifications(data as any[])
        setLoading(false)
    }

    const markAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)

        if (!error) {
            setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
            window.dispatchEvent(new Event('notificationsUpdated'))
        }
    }

    const deleteNotification = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)

        if (!error) {
            setNotifications(notifications.filter(n => n.id !== id))
            window.dispatchEvent(new Event('notificationsUpdated'))
        }
    }

    const markAllAsRead = async () => {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user!.id)
            .eq('read', false)

        if (!error) {
            setNotifications(notifications.map(n => ({ ...n, read: true })))
            window.dispatchEvent(new Event('notificationsUpdated'))
        }
    }

    const clearAllNotifications = async () => {
        if (!confirm("Are you sure you want to delete all notifications?")) return

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user!.id)

        if (!error) {
            setNotifications([])
            window.dispatchEvent(new Event('notificationsUpdated'))
        }
    }

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await markAsRead(notification.id, { stopPropagation: () => { } } as React.MouseEvent)
        }

        switch (notification.type) {
            case 'payment_update':
                router.push('/player/bookings')
                break
            default:
                break
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white">{t.dashboard.notifications.title}</h1>
                    <p className="text-muted-foreground">Mantente actualizado con las actividades del sistema</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllAsRead}
                        className="flex-1 sm:flex-none border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                        disabled={notifications.every(n => n.read)}
                    >
                        <Check className="mr-2 h-4 w-4" />
                        <span className="truncate">{t.dashboard.notifications.mark_all_read}</span>
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={clearAllNotifications}
                        className="flex-1 sm:flex-none"
                        disabled={notifications.length === 0}
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        <span className="truncate">{t.dashboard.notifications.delete_all}</span>
                    </Button>
                </div>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                            <p className="text-muted-foreground animate-pulse">{t.dashboard.notifications.loading}</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
                            <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                                <Bell className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-medium text-muted-foreground">{t.dashboard.notifications.empty}</p>
                                <p className="text-sm text-muted-foreground/60">Te notificaremos cuando algo importante suceda.</p>
                            </div>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border/50">
                            {notifications.map((notification) => (
                                <li
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        "group p-5 hover:bg-muted/30 transition-all duration-200 cursor-pointer relative overflow-hidden",
                                        !notification.read && "bg-primary/5 hover:bg-primary/10"
                                    )}
                                >
                                    {/* Unread Indicator */}
                                    {!notification.read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                                    )}

                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "flex-shrink-0 mt-1 h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                                            notification.read
                                                ? "bg-muted text-muted-foreground"
                                                : "bg-primary/20 text-primary"
                                        )}>
                                            {notification.read ? <MailOpen className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                                        </div>

                                        <div className="flex-1 space-y-1">
                                            <div className="flex justify-between items-start gap-2">
                                                <p className={cn(
                                                    "text-sm font-medium leading-none",
                                                    notification.read ? "text-muted-foreground" : "text-white"
                                                )}>
                                                    {notification.message}
                                                </p>
                                                <span className="text-xs text-primary font-medium whitespace-nowrap">
                                                    {new Date(notification.sent_at || Date.now()).toLocaleDateString(undefined, {
                                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            {/* Type indicator or extra info could go here */}
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notification.read && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => markAsRead(notification.id, e)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={(e) => deleteNotification(notification.id, e)}
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                title={t.dashboard.notifications.delete}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
