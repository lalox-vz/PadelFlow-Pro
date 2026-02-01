"use client"

import { useLanguage } from "@/context/LanguageContext"
import { Calendar } from "@/components/calendar/Calendar"
import { TrainingSession } from "@/types"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { ScheduleSection } from "@/components/marketing/ScheduleSection"
import { TrainingDetailsModal } from "@/components/calendar/TrainingDetailsModal"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"

export default function TrainingsPage() {
    const { t } = useLanguage()
    const { user } = useAuth()
    const router = useRouter()
    const [trainings, setTrainings] = useState<TrainingSession[]>([])
    const [loading, setLoading] = useState(true)

    // Modal State
    const [selectedTraining, setSelectedTraining] = useState<TrainingSession | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        fetchTrainings()
    }, [])

    const fetchTrainings = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('trainings')
            .select('*, coach:coaches(*)')
        // .gte('start_time', new Date().toISOString()) // Optional filter

        if (error) {
            console.error('Error fetching trainings:', error)
        } else {
            setTrainings(data as TrainingSession[])
        }
        setLoading(false)
    }

    const handleTrainingClick = (training: TrainingSession) => {
        setSelectedTraining(training)
        setIsModalOpen(true)
    }

    const handleBookClick = () => {
        if (!user) {
            // Requirement: "attempts to click Book then it send him to Sign up"
            setIsModalOpen(false)
            router.push('/signup')
            return
        }

        // If user IS logged in, theoretically they should use the Client Dashboard.
        // We can redirect them there or allow booking, but usually public pages redirect to app.
        router.push('/client/book')
    }

    // Removed dummy data to ensure we see real DB state
    const displayTrainings = trainings

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <ScheduleSection />

            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{t.trainings.title}</h1>
                    <p className="mt-2 text-muted-foreground">{t.trainings.subtitle}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center">{t.trainings.loading}</div>
                ) : (
                    <Calendar
                        trainings={displayTrainings}
                        onUpdate={fetchTrainings}
                        onTrainingClick={handleTrainingClick} // Pass handler
                    />
                )}
            </div>

            <TrainingDetailsModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                training={selectedTraining}
                onConfirm={handleBookClick}
                actionLabel={t.calendar?.book_now || "Reservar"}
            />
        </div>
    )
}
