"use client"

import { TrainingSession } from "@/types"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { Clock, Users, User, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"

interface GridViewProps {
    trainings: TrainingSession[]
    onTrainingClick: (training: TrainingSession) => void
    isMyTrainings?: boolean
    onCancel?: (id: string) => void
    isAdmin?: boolean
    enrolledTrainingIds?: Set<string>
}

export function GridView({ trainings, onTrainingClick, isMyTrainings, onCancel, isAdmin, enrolledTrainingIds }: GridViewProps) {
    const { t, language } = useLanguage()
    const locale = language === 'es' ? es : enUS

    // Color Logic Helper
    const getTrainingColor = (type: string) => {
        switch (type) {
            case 'Yoga': return 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-100'
            case 'Functional': return 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-100'
            case 'Hyrox': return 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-100'
            case 'Crossfit': return 'bg-zinc-100 border-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100'
            default: return 'bg-card border-border text-foreground hover:border-primary/50'
        }
    }

    const getTrainingBadgeColor = (type: string) => {
        switch (type) {
            case 'Yoga': return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
            case 'Functional': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
            case 'Hyrox': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            case 'Crossfit': return 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
            default: return 'bg-primary/10 text-primary'
        }
    }

    if (trainings.length === 0) {
        return <div className="p-8 text-center text-gray-500">{t.calendar.no_trainings}</div>
    }

    const sortedTrainings = [...trainings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTrainings.map((training) => {
                const isPast = new Date(training.start_time) < new Date()
                const isFull = (training.participant_count || 0) >= (training.capacity || 20)
                const isEnrolled = enrolledTrainingIds?.has(training.id)

                return (
                    <div
                        key={training.id}
                        onClick={() => !isPast && isAdmin && onTrainingClick(training)}
                        className={cn(
                            "rounded-xl p-5 shadow-sm border transition-shadow hover:shadow-md flex flex-col justify-between h-full",
                            getTrainingColor(training.type),
                            isAdmin && !isPast && "cursor-pointer hover:scale-[1.02] transition-transform",
                            isPast && "opacity-75 bg-gray-50 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)] cursor-not-allowed grayscale-[0.5]",
                            isEnrolled && "ring-1 ring-green-500 border-green-500 bg-green-50/30"
                        )}
                    >
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <span className={cn("text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider", getTrainingBadgeColor(training.type), isPast && "bg-gray-200 text-gray-500")}>
                                    {training.type}
                                </span>
                                {isEnrolled && (
                                    <span className="text-[10px] font-bold text-green-700 bg-white/80 border border-green-200 px-2 py-1 rounded-full">
                                        ✓ INSCRITO
                                    </span>
                                )}
                                <div className="text-right">
                                    <span className="block text-xl font-bold leading-none">
                                        {format(new Date(training.start_time), "d")}
                                    </span>
                                    <span className="block text-xs uppercase opacity-75">
                                        {format(new Date(training.start_time), "MMM", { locale })}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-start justify-between gap-2">
                                <h3 className={cn("font-bold text-lg mb-1 leading-tight", isPast && "line-through text-gray-500")}>{training.title}</h3>
                                {isFull && !isPast && (
                                    <span className="shrink-0 text-[10px] font-bold text-red-600 bg-white/80 border border-red-100 px-1.5 py-0.5 rounded">
                                        {t.calendar?.full || 'FULL'}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2 text-sm opacity-80 mt-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {format(new Date(training.start_time), "EEEE h:mm a", { locale })}
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {training.instructor || "Coach"}
                                </div>
                                {training.participant_count !== undefined && !isMyTrainings && (
                                    <div className={cn("flex items-center gap-2", isFull && !isPast && "text-red-700 font-bold")}>
                                        <Users className="w-4 h-4" />
                                        {training.participant_count} / {training.capacity || 20}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-black/5">
                            {isMyTrainings ? (
                                <Button variant="destructive" className="w-full bg-white/80 hover:bg-white text-red-600 border border-red-200" onClick={() => onCancel?.(training.id as any)}>
                                    Cancel Class
                                </Button>
                            ) : (
                                <Button
                                    disabled={isPast || (isFull && !isAdmin) || (isEnrolled && !isAdmin)}
                                    className={cn(
                                        "w-full bg-black/5 hover:bg-black/10 text-current border-none shadow-none",
                                        isPast && "opacity-50",
                                        isEnrolled && "bg-green-100/50 text-green-800 hover:bg-green-100 cursor-default opacity-100"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (!isPast && !isEnrolled) onTrainingClick(training)
                                    }}>
                                    {isAdmin ? (language === 'es' ? 'Ver Detalles' : 'View Details') : (
                                        isEnrolled ? (language === 'es' ? 'Inscrito' : 'Enrolled') : (t.calendar?.book_now || 'Book Now')
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
