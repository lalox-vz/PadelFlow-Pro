"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Sun, Sunset, Clock, Dumbbell, User } from "lucide-react" // Added appropriate icons
import { cn } from "@/lib/utils"

export function ScheduleSection() {
    const { t, language } = useLanguage()

    // Helper to get labels based on lang since we are changing the display format from the original string
    const getMorningLabel = () => language === 'es' ? 'Turno Mañana' : 'Morning Shift'
    const getAfternoonLabel = () => language === 'es' ? 'Turno Tarde' : 'Afternoon Shift'

    const scheduleData = [
        {
            id: 'functional',
            title: t.schedule.functional.title,
            icon: Dumbbell,
            color: 'from-blue-500/20 to-indigo-500/20', // Gradient background
            borderColor: 'border-blue-200/50',
            textColor: 'text-blue-900',
            badgeColor: 'bg-blue-100/50 text-blue-700 hover:bg-blue-200/50',
            shifts: [
                {
                    icon: Sun,
                    label: getMorningLabel(),
                    times: ['6:30 AM', '7:30 AM']
                },
                {
                    icon: Sunset,
                    label: getAfternoonLabel(),
                    times: ['5:30 PM', '6:30 PM', '7:30 PM']
                }
            ]
        },
        {
            id: 'personalized',
            title: t.schedule.personalized.title,
            icon: User,
            color: 'from-orange-500/20 to-red-500/20',
            borderColor: 'border-orange-200/50',
            textColor: 'text-orange-900',
            badgeColor: 'bg-orange-100/50 text-orange-700 hover:bg-orange-200/50',
            shifts: [
                {
                    icon: Sun,
                    label: getMorningLabel(),
                    times: ['8:30 AM - 12:00 PM']
                },
                {
                    icon: Sunset,
                    label: getAfternoonLabel(),
                    times: ['2:00 PM - 5:00 PM']
                }
            ]
        }
    ]

    return (
        <div className="mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-8 border-l-4 border-indigo-500 pl-4">
                {t.schedule.section_title}
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
                {scheduleData.map((category) => (
                    <div
                        key={category.id}
                        className={cn(
                            "relative overflow-hidden rounded-2xl border p-6 backdrop-blur-md transition-all hover:shadow-lg",
                            "bg-card/80", // Semantic card background
                            category.borderColor
                        )}
                    >
                        {/* Decorative Gradient Background */}
                        <div className={cn(
                            "absolute inset-0 opacity-30 bg-gradient-to-br",
                            category.color
                        )} />

                        {/* Content */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className={cn("p-2 rounded-lg bg-background/50 backdrop-blur-sm shadow-sm", category.textColor)}>
                                    <category.icon className="w-6 h-6" />
                                </div>
                                <h3 className={cn("text-xl font-bold", category.textColor)}>
                                    {category.title}
                                </h3>
                            </div>

                            <div className="space-y-6">
                                {category.shifts.map((shift, idx) => (
                                    <div key={idx} className="space-y-3">
                                        <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                            <shift.icon className="w-4 h-4 text-amber-500" />
                                            <span className="text-sm uppercase tracking-wide">{shift.label}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {shift.times.map((time, tIdx) => (
                                                <div
                                                    key={tIdx}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-sm font-bold font-mono transition-colors cursor-default shadow-sm border border-transparent",
                                                        category.badgeColor,
                                                        "hover:border-black/5 dark:hover:border-white/5"
                                                    )}
                                                >
                                                    {time}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
