"use client"

import { TrainingSession } from "@/types"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { Clock, Users, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"

interface ListViewProps {
    trainings: TrainingSession[]
    onTrainingClick: (training: TrainingSession) => void
    isMyTrainings?: boolean
    onCancel?: (id: string) => void
    isAdmin?: boolean
    enrolledTrainingIds?: Set<string>
}

export function ListView({ trainings, onTrainingClick, isMyTrainings, onCancel, isAdmin, enrolledTrainingIds }: ListViewProps) {
    const { t, language } = useLanguage()
    const locale = language === 'es' ? es : enUS

    // Sort by date only for list view
    const sortedTrainings = [...trainings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    if (trainings.length === 0) {
        return <div className="p-8 text-center text-gray-500">{t.calendar.no_trainings}</div>
    }

    return (
        <div className="space-y-4">
            {sortedTrainings.map((training) => {
                const isPast = new Date(training.start_time) < new Date()
                const isFull = (training.participant_count || 0) >= (training.capacity || 20)
                const isEnrolled = enrolledTrainingIds?.has(training.id)

                return (
                    <div
                        key={training.id}
                        onClick={() => !isPast && isAdmin && onTrainingClick(training)}
                        className={cn(
                            "bg-card rounded-lg p-4 shadow-sm border border-border flex items-center justify-between hover:border-primary/50 transition-colors",
                            isAdmin && !isPast && "cursor-pointer hover:bg-muted/50",
                            isPast && "opacity-75 bg-muted/20 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)] cursor-not-allowed grayscale-[0.5]",
                            isEnrolled && "ring-1 ring-green-500 border-green-500 bg-green-50/20 dark:bg-green-900/10"
                        )}
                    >
                        <div className="flex gap-4 items-center">
                            <div className={cn("flex flex-col items-center px-3 py-2 rounded", isPast ? "bg-muted" : isEnrolled ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-primary/10")}>
                                <span className={cn("text-xs font-bold uppercase", isPast ? "text-muted-foreground" : isEnrolled ? "text-green-600 dark:text-green-400" : "text-primary")}>{format(new Date(training.start_time), "MMM", { locale })}</span>
                                <span className={cn("text-xl font-bold", isPast ? "text-muted-foreground/80" : isEnrolled ? "text-green-800 dark:text-green-200" : "text-foreground")}>{format(new Date(training.start_time), "d")}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className={cn("font-semibold text-foreground", isPast && "line-through text-muted-foreground")}>{training.title}</h3>
                                    {isFull && !isPast && (
                                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 px-1.5 py-0.5 rounded">
                                            {t.calendar?.full || 'AGOTADO'}
                                        </span>
                                    )}
                                    {isEnrolled && (
                                        <span className="text-[10px] font-bold text-green-700 bg-white border border-green-200 px-1.5 py-0.5 rounded">
                                            ✓ INSCRITO
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-sm text-muted-foreground mt-1">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {format(new Date(training.start_time), "h:mm a")}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <User className="w-3.5 h-3.5" />
                                        {training.instructor}
                                    </span>
                                    {training.participant_count !== undefined && !isMyTrainings && (
                                        <span className={cn("flex items-center gap-1", isFull && !isPast && "text-red-600 font-bold")}>
                                            <Users className="w-3.5 h-3.5" />
                                            {training.participant_count} / {training.capacity || 20}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div>
                            {isMyTrainings ? (
                                <Button variant="destructive" size="sm" onClick={(e) => {
                                    e.stopPropagation()
                                    onCancel?.(training.id as any)
                                }}>
                                    Cancel
                                </Button>
                            ) : (
                                <Button size="sm"
                                    disabled={isPast || (isFull && !isAdmin) || (isEnrolled && !isAdmin)}
                                    className={cn(isPast && "opacity-50", isEnrolled && "bg-green-100 text-green-800 hover:bg-green-100 cursor-default")}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isPast && !isEnrolled) onTrainingClick(training)
                                    }}>
                                    {isAdmin ? (language === 'es' ? 'Ver Detalles' : 'View Details') : (
                                        isEnrolled ? (language === 'es' ? 'Inscrito' : 'Enrolled') : (t.calendar?.book_now || 'Book')
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
