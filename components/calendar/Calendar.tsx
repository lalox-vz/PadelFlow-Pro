"use client"

import { useState, useEffect } from "react"
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    startOfDay
} from "date-fns"
import { es, enUS } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TrainingSession, TrainingType } from "@/types"
import { cn } from "@/lib/utils"
import { DayDetailsModal } from "./DayDetailsModal"
import { useLanguage } from "@/context/LanguageContext"

interface CalendarProps {
    trainings: TrainingSession[]
    onTrainingClick?: (trainingSession: TrainingSession) => void
    onUpdate?: () => void
    onAddTraining?: (date: Date) => void
    enrolledTrainingIds?: Set<string>
}

export function Calendar({ trainings, onTrainingClick, onUpdate, onAddTraining, enrolledTrainingIds }: CalendarProps) {
    const { t, language } = useLanguage()
    const locale = language === 'es' ? es : enUS
    const [currentDate, setCurrentDate] = useState<Date | null>(null)
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedType, setSelectedType] = useState<TrainingType | 'All'>('All')

    useEffect(() => {
        setCurrentDate(new Date())
    }, [])

    const handleDayClick = (day: Date) => {
        setSelectedDay(day)
        // Only open modal on desktop (md breakpoint is 768px)
        if (window.innerWidth >= 768) {
            setIsModalOpen(true)
        }
    }

    const onNextMonth = () => currentDate && setCurrentDate(addMonths(currentDate, 1))
    const onPrevMonth = () => currentDate && setCurrentDate(subMonths(currentDate, 1))
    const onToday = () => setCurrentDate(new Date())

    if (!currentDate) {
        return <div className="p-10 text-center text-gray-500">{t.calendar.loading}</div>
    }

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale })
    const endDate = endOfWeek(monthEnd, { locale })

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    // Generate week days for header based on current locale
    const weekDays = eachDayOfInterval({
        start: startOfWeek(currentDate, { locale }),
        end: endOfWeek(currentDate, { locale })
    })

    // Filter trainings based on selected type
    const filteredTrainings = selectedType === 'All'
        ? trainings
        : trainings.filter(c => c.type === selectedType)

    // Group trainings by day for easier rendering
    const getTrainingsForDay = (day: Date) => {
        return filteredTrainings.filter(c => isSameDay(new Date(c.start_time), day))
    }

    // Color Logic
    // Color Logic
    const getTrainingColor = (type: string) => {
        switch (type) {
            case 'Yoga': return 'bg-sky-100 text-sky-900 border-sky-200 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-100'
            case 'Functional': return 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-100'
            case 'Hyrox': return 'bg-yellow-100 text-yellow-900 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-100'
            case 'Crossfit': return 'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700 dark:bg-zinc-700'
            default: return 'bg-primary/20 text-foreground border-primary/30 hover:bg-primary/30'
        }
    }

    return (
        <div className="bg-card rounded-lg shadow-sm ring-1 ring-border">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-border gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-foreground capitalize">
                        {format(currentDate, "MMMM yyyy", { locale })}
                    </h2>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as TrainingType | 'All')}
                        className="rounded-md border-input bg-background shadow-sm focus:border-ring focus:ring-ring sm:text-sm p-2 border text-foreground w-full sm:w-auto"
                    >
                        <option value="All">{t.calendar.all_trainings}</option>
                        <option value="Functional">{language === 'es' ? 'Funcional' : 'Functional'}</option>
                        <option value="Yoga">Yoga</option>
                        <option value="Hyrox">Hyrox</option>
                        <option value="Crossfit">Crossfit</option>
                    </select>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={onPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" onClick={onToday}>{t.calendar.today}</Button>
                    <Button variant="outline" size="icon" onClick={onNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid - Responsive */}
            <div className="border border-border rounded-lg overflow-hidden">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center text-xs leading-6 text-muted-foreground font-semibold lg:text-sm">
                    {weekDays.map((day) => (
                        <div key={day.toString()} className="py-2 capitalize">
                            {format(day, "EEE", { locale }).slice(0, 3)}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7 bg-border gap-px">
                    {calendarDays.map((day) => {
                        const dayTrainings = getTrainingsForDay(day)
                        const isSelectedMonth = isSameMonth(day, monthStart)
                        const isCurrentWeek = isSameDay(startOfWeek(day, { locale }), startOfWeek(new Date(), { locale }))
                        const isSelected = selectedDay && isSameDay(day, selectedDay)
                        const isPast = startOfDay(day) < startOfDay(new Date())

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    "relative bg-card hover:bg-muted/50 transition-colors cursor-pointer group flex flex-col items-center p-1 md:p-2",
                                    "min-h-[4rem] md:min-h-[120px]", // Responsive height
                                    !isSelectedMonth && "bg-muted/10 text-muted-foreground/40",
                                    isPast && "bg-muted/20 text-muted-foreground/40 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)]",
                                    isCurrentWeek && isSelectedMonth && !isPast && "bg-accent/10 ring-1 ring-inset ring-primary/20",
                                    isSelected && "ring-2 ring-inset ring-primary z-10"
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-xs md:text-sm font-semibold mb-1",
                                        isToday(day) && "bg-primary text-primary-foreground",
                                        !isSelectedMonth && !isToday(day) && "text-muted-foreground/40",
                                        isSelectedMonth && !isToday(day) && "text-foreground",
                                        isPast && !isToday(day) && "text-muted-foreground/40"
                                    )}
                                >
                                    {format(day, "d")}
                                </span>

                                {/* Mobile Dots */}
                                <div className="flex gap-0.5 md:hidden h-1.5 items-end">
                                    {dayTrainings.slice(0, 3).map((training, i) => {
                                        let dotColor = 'bg-gray-400'
                                        switch (training.type) {
                                            case 'Yoga': dotColor = 'bg-green-500'; break;
                                            case 'Functional': dotColor = 'bg-blue-500'; break;
                                            case 'Hyrox': dotColor = 'bg-yellow-500'; break;
                                            case 'Crossfit': dotColor = 'bg-orange-500'; break;
                                            default: dotColor = 'bg-indigo-500';
                                        }
                                        return (
                                            <div key={i} className={`w-1 h-1 rounded-full ${dotColor}`} />
                                        )
                                    })}
                                    {dayTrainings.length > 3 && <div className="text-[6px] text-gray-400">+</div>}
                                </div>

                                {/* Desktop Events */}
                                <div className="hidden md:block w-full space-y-1 mt-1">
                                    {dayTrainings.map((c) => {
                                        const isFull = (c.participant_count || 0) >= (c.capacity || 20)
                                        const isEventPast = new Date(c.start_time) < new Date()
                                        const isEnrolled = enrolledTrainingIds?.has(c.id)

                                        return (
                                            <button
                                                key={c.id}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (!isEventPast) onTrainingClick?.(c)
                                                }}
                                                disabled={isEventPast}
                                                className={cn(
                                                    "w-full text-left rounded px-2 py-1 text-xs truncate border flex flex-col group",
                                                    getTrainingColor(c.type),
                                                    isFull && "opacity-75",
                                                    isEventPast && "opacity-50 cursor-not-allowed hover:bg-transparent border-border bg-muted/50 text-muted-foreground grayscale",
                                                    isEnrolled && "ring-1 ring-green-600 border-green-400 bg-green-500/10 dark:bg-green-900/30"
                                                )}
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <span className={cn("font-semibold block truncate flex-1 flex items-center gap-1", isEventPast && "line-through")}>
                                                        {isEnrolled && <span className="text-green-600 font-bold">✓</span>}
                                                        {c.title}
                                                    </span>
                                                    {isFull && !isEventPast && <span className="text-[9px] font-bold text-red-600 ml-1 bg-white/80 px-1 rounded">{t.calendar?.full || 'FULL'}</span>}
                                                </div>
                                                <span className="flex justify-between items-center text-[10px] opacity-80 w-full mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {format(new Date(c.start_time), "h:mm a")}
                                                    </span>
                                                    <span className={cn("text-[9px] font-mono bg-white/50 px-1 rounded", isFull && !isEventPast && "text-red-600 font-bold")}>
                                                        {c.participant_count || 0}/{c.capacity || 20}
                                                    </span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Mobile: Selected Day Details (Appears below grid) */}
            <div className="md:hidden mt-4">
                {selectedDay ? (
                    <div className="border border-border rounded-lg p-4 bg-card shadow-sm animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold text-foreground mb-3 capitalize border-b border-border pb-2">
                            {format(selectedDay, "EEEE, MMMM d", { locale })}
                        </h3>
                        {getTrainingsForDay(selectedDay).length > 0 ? (
                            <div className="space-y-3">
                                {getTrainingsForDay(selectedDay).map((c) => {
                                    const isFull = (c.participant_count || 0) >= (c.capacity || 20)
                                    const isEventPast = new Date(c.start_time) < new Date()
                                    const isEnrolled = enrolledTrainingIds?.has(c.id)

                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => !isEventPast && onTrainingClick?.(c)}
                                            disabled={isEventPast}
                                            className={cn(
                                                "w-full text-left rounded-md p-3 text-sm border flex justify-between items-center shadow-sm",
                                                getTrainingColor(c.type),
                                                isFull && "opacity-90",
                                                isEventPast && "opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 grayscale",
                                                isEnrolled && "ring-1 ring-green-500 border-green-500 bg-green-50/50"
                                            )}
                                        >
                                            <div>
                                                <div className="font-bold flex items-center gap-2">
                                                    <span className={cn(isEventPast && "line-through text-gray-500")}>{c.title}</span>
                                                    {isFull && !isEventPast && <span className="text-[10px] font-bold text-red-600 bg-white/90 px-1.5 py-0.5 rounded border border-red-200">{t.calendar?.full || 'AGOTADO'}</span>}
                                                    {isEnrolled && <span className="text-[10px] font-bold text-green-700 bg-white/90 px-1.5 py-0.5 rounded border border-green-200">✓ INSCRITO</span>}
                                                </div>
                                                <div className="text-xs mt-1 flex gap-2 opacity-80">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {format(new Date(c.start_time), "h:mm a")}
                                                    </span>
                                                    <span className={cn("flex items-center gap-1", isFull && !isEventPast && "font-bold text-red-700")}>
                                                        <Users className="w-3 h-3" /> {c.participant_count || 0}/{c.capacity || 20}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">{language === 'es' ? 'No hay entrenamientos programados.' : 'No trainings scheduled.'}</p>
                        )}
                    </div>
                ) : (
                    <p className="text-foreground text-sm text-center italic mt-4">{language === 'es' ? 'Toca una fecha para ver detalles' : 'Tap a date to see details'}</p>
                )}
            </div>

            {/* Desktop Modal still useful or disable? 
                User asked for "class details appearing below when a day is tapped" on MOBILE.
                Desktop can keep Modal or standard view. Standard view shows events IN grid.
                The Modal logic in original file was triggered by handleDayClick.
                I'll keep `DayDetailsModal` for logic but conditionally render or used ONLY for desktop expansion if simple click isn't enough?
                Actually, on desktop, clicking a day normally opens a modal in many calendar apps if the cell is too small.
                But our desktop cell is detailed.
                However, existing code used `DayDetailsModal`. I should probably keep it for Desktop if needed, or if I want to strictly follow "details below" for mobile.
                
                The `handleDayClick` sets `selectedDay`.
                On desktop, `DayDetailsModal` was used.
                On mobile, it will now show the detailed list below.
                
                I'll make sure `DayDetailsModal` only shows on Desktop if needed, or remove it if I trust the grid.
                Actually, the grid cells on desktop truncate. A modal is good for "view all".
                But `handleDayClick` logic:
                `setSelectedDay(day); setIsModalOpen(true);`
                I should change this. 
                Mobile: `setSelectedDay(day);` (do not open modal).
                Desktop: `setSelectedDay(day); setIsModalOpen(true);`?
                
                Let's adapt `handleDayClick`.
            */}

            <DayDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                date={selectedDay}
                trainings={selectedDay ? getTrainingsForDay(selectedDay) : []}
                onUpdate={onUpdate}
                onAddTraining={onAddTraining}
            />
        </div >
    )
}
