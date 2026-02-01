"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TrainingSession } from "@/types"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"
import { Clock, User as UserIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface DayDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    date: Date | null
    trainings: TrainingSession[]
    onUpdate?: () => void
    onAddTraining?: (date: Date) => void
}

export function DayDetailsModal({ isOpen, onClose, date, trainings, onUpdate, onAddTraining }: DayDetailsModalProps) {
    const { user, profile } = useAuth()
    const { t, language } = useLanguage()
    const router = useRouter()
    const [registrations, setRegistrations] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const locale = language === 'es' ? es : enUS

    // Check Membership
    const hasMembership = profile?.membership_tier && profile.membership_tier !== 'Not a Member'

    useEffect(() => {
        if (user && isOpen && trainings.length > 0) {
            fetchRegistrations()
        }
    }, [user, isOpen, trainings])

    const fetchRegistrations = async () => {
        if (!user) return
        const { data } = await supabase
            .from('registrations')
            .select('training_id')
            .eq('user_id', user.id)
            .eq('status', 'confirmed')
            .in('training_id', trainings.map(c => c.id))

        if (data) {
            setRegistrations(data.map(r => r.training_id))
        }
    }

    const handleBook = async (trainingId: string) => {
        if (!user) {
            alert(t.trainings.alert_signin)
            router.push('/login')
            return
        }

        setProcessingId(trainingId)
        try {
            const { error } = await supabase
                .from('registrations')
                .insert({
                    user_id: user.id,
                    training_id: trainingId,
                    status: 'confirmed'
                })

            if (error) throw error

            await fetchRegistrations()
            if (onUpdate) onUpdate()
            alert(t.calendar.booking_confirmed)
        } catch (error) {
            console.error(error)
            alert(t.calendar.booking_failed)
        } finally {
            setProcessingId(null)
        }
    }

    const handleCancel = async (trainingId: string) => {
        if (!user) return

        setProcessingId(trainingId)
        try {
            const { error } = await supabase
                .from('registrations')
                .delete()
                .eq('user_id', user.id)
                .eq('training_id', trainingId)

            if (error) throw error

            await fetchRegistrations()
            if (onUpdate) onUpdate()
            alert(t.calendar.cancel_confirmed)
        } catch (error) {
            console.error(error)
            alert(t.calendar.cancel_failed)
        } finally {
            setProcessingId(null)
        }
    }

    if (!date) return null

    const isAdmin = user?.user_metadata?.role === 'admin'

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card ring-1 ring-border text-foreground">
                <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
                    <DialogTitle className="text-xl font-bold capitalize text-foreground">
                        {format(date, "EEEE, MMMM d, yyyy", { locale })}
                    </DialogTitle>
                    {isAdmin && onAddTraining && (
                        <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
                            onClick={() => {
                                onAddTraining(date)
                                onClose()
                            }}
                        >
                            {t.dashboard.manage_trainings.add_training}
                        </Button>
                    )}
                </DialogHeader>

                <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {trainings.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">{t.calendar.no_trainings}</p>
                    ) : (
                        trainings.map((session) => {
                            const isBooked = registrations.includes(session.id)
                            const isProcessing = processingId === session.id
                            const isPast = new Date(session.start_time) < new Date()

                            return (
                                <div key={session.id} className="border border-border rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-lg text-foreground">{session.title}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${session.type === 'Yoga' ? 'bg-purple-500/10 text-purple-500' :
                                            session.type === 'Hyrox' ? 'bg-yellow-500/10 text-yellow-500' :
                                                'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {session.type}
                                        </span>
                                    </div>

                                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                                        <Clock className="w-4 h-4 mr-1" />
                                        {format(new Date(session.start_time), "h:mm a")} - {format(new Date(session.end_time), "h:mm a")}
                                    </div>

                                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                                        <UserIcon className="w-4 h-4 mr-1" />
                                        {t.calendar.instructor}: {session.instructor || 'TBA'}
                                    </div>

                                    {isAdmin ? (
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => router.push(`/admin/trainings/${session.id}`)}
                                        >
                                            {t.calendar.edit_admin}
                                        </Button>
                                    ) : (
                                        !isPast && (
                                            <>
                                                <Button
                                                    className={`w-full ${isBooked ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-primary hover:bg-primary/90 text-primary-foreground'}`}
                                                    disabled={isProcessing || (!isBooked && !hasMembership)}
                                                    onClick={() => isBooked ? handleCancel(session.id) : handleBook(session.id)}
                                                >
                                                    {isProcessing ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            {language === 'es' ? "Confirmando tu reserva..." : "Confirming..."}
                                                        </>
                                                    ) : isBooked ? (
                                                        <><CheckCircle className="w-4 h-4 mr-2" /> {t.calendar.booked_undo}</>
                                                    ) : !hasMembership ? (
                                                        language === 'es' ? 'Sin Membresía' : 'No Membership'
                                                    ) : (
                                                        t.calendar.book_now
                                                    )}
                                                </Button>
                                                {!isBooked && !hasMembership && (
                                                    <p className="text-xs text-destructive text-center mt-1">
                                                        {language === 'es' ? 'Membresía requerida para reservar' : 'Membership required to book'}
                                                    </p>
                                                )}
                                            </>
                                        )
                                    )}

                                    {isPast && !isAdmin && (
                                        <p className="text-xs text-center text-muted-foreground mt-2 italic">{t.calendar.training_completed}</p>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
