"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Calendar } from "@/components/calendar/Calendar"
import { TrainingSession } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon"
import { useLanguage } from "@/context/LanguageContext"
import { ViewToggle, ViewType } from "@/components/common/ViewToggle"
import { ListView } from "@/components/calendar/ListView"
import { GridView } from "@/components/calendar/GridView"
import { format } from "date-fns"
import { Users, Mail, Phone, Calendar as CalendarIcon } from "lucide-react"
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { es, enUS } from "date-fns/locale"

// Simple Modal Component
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
            <div className="bg-card rounded-lg w-full max-w-md shadow-xl overflow-hidden ring-1 ring-border">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50">
                    <h3 className="text-lg font-bold text-foreground">{title}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    {children}
                </div>
            </div>
        </div>
    )
}

export default function AdminTrainingsPage() {
    const { t } = useLanguage()
    const [trainings, setTrainings] = useState<TrainingSession[]>([])
    const [coaches, setCoaches] = useState<any[]>([])
    const [view, setView] = useState<ViewType>('calendar')
    // Participant Modal State
    const [selectedTraining, setSelectedTraining] = useState<TrainingSession | null>(null)
    const [participants, setParticipants] = useState<any[]>([])
    const [loadingParticipants, setLoadingParticipants] = useState(false)
    const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false)

    // Create Training Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [formData, setFormData] = useState({
        title: '',
        type: 'Functional',
        start_time: '',
        duration: 60,
        instructor: '',
        coach_id: '',
        capacity: 20
    })
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    useEffect(() => {
        const savedView = localStorage.getItem('adminTrainingView') as ViewType
        if (savedView) setView(savedView)
        fetchTrainings()
        fetchCoaches()
    }, [])

    const handleViewChange = (newView: ViewType) => {
        setView(newView)
        localStorage.setItem('adminTrainingView', newView)
    }

    const fetchTrainings = async () => {
        const { data } = await supabase
            .from('trainings')
            .select('*, registrations(count)')
            .order('start_time', { ascending: true })

        if (data) {
            const mappedData = data.map((t: any) => ({
                ...t,
                participant_count: t.registrations ? t.registrations[0].count : 0
            }))
            setTrainings(mappedData as TrainingSession[])
        }
    }

    const fetchCoaches = async () => {
        const { data } = await supabase.from('coaches').select('*')
        if (data) setCoaches(data)
    }

    const handleTrainingClick = async (training: TrainingSession) => {
        setSelectedTraining(training)
        setLoadingParticipants(true)
        setIsParticipantsModalOpen(true)
        setParticipants([])

        const { data } = await supabase
            .from('registrations')
            .select('*, user:users(full_name, email, phone)')
            .eq('training_id', training.id)
            .eq('status', 'confirmed')
            .order('created_at', { ascending: true })

        if (data) setParticipants(data)
        setLoadingParticipants(false)
    }

    const handleCreateTraining = async (e: React.FormEvent) => {
        e.preventDefault()
        // Calculate end_time based on duration
        const start = new Date(formData.start_time)
        const end_time = new Date(start.getTime() + formData.duration * 60 * 1000).toISOString()
        const start_iso = start.toISOString()

        // Check for overlaps
        // We look for any training where:
        // (NewStart < ExistingEnd) AND (NewEnd > ExistingStart)
        // This covers all forms of overlap: enclosing, enclosed, partial start, partial end.

        const { data: existingTrainings, error: overlapError } = await supabase
            .from('trainings')
            .select('start_time, end_time, title')
            .lt('start_time', end_time)
            .gt('end_time', start_iso)

        if (overlapError) {
            console.error("Error checking overlaps:", overlapError)
            // Proceed with caution or alert user? For now let's fail safe or just alert.
        }

        if (existingTrainings && existingTrainings.length > 0) {
            alert(t.dashboard.manage_trainings.errors.conflict_error)
            return
        }

        const { error } = await supabase.from('trainings').insert({
            title: formData.title,
            type: formData.type,
            start_time: start_iso,
            end_time: end_time,
            instructor: formData.instructor, // Keeps legacy string field
            coach_id: formData.coach_id || null, // New relation
            capacity: formData.capacity
        })

        if (error) {
            alert(t.dashboard.manage_trainings.errors.create + error.message)
        } else {
            setIsCreateModalOpen(false)
            fetchTrainings()
            setFormData({
                title: '',
                type: 'Functional',
                start_time: '',
                duration: 60,
                instructor: '',
                coach_id: '',
                capacity: 20
            })
        }
    }
    const handleDeleteTraining = async (id: string) => {
        if (!confirm(t.dashboard.manage_trainings.errors.delete_confirm)) return
        const { error } = await supabase.from('trainings').delete().eq('id', id)
        if (error) alert(t.dashboard.manage_trainings.errors.delete + error.message)
        else fetchTrainings()
    }

    const openCreateModal = (date?: Date) => {
        const targetDate = date ? new Date(date) : new Date()

        if (date) {
            // If date provided (from calendar), set to 8:00 AM
            targetDate.setHours(8, 0, 0, 0)
        } else {
            // If no date (generic add), set to next hour generic
            targetDate.setMinutes(0, 0, 0)
            targetDate.setHours(targetDate.getHours() + 1)
        }

        const pad = (n: number) => n.toString().padStart(2, '0')
        const startStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetDate.getHours())}:${pad(targetDate.getMinutes())}`

        setFormData({
            title: '',
            type: 'Functional',
            start_time: startStr,
            duration: 60,
            instructor: '',
            coach_id: '',
            capacity: 20
        })
        setIsCreateModalOpen(true)
    }

    return (
        <div>
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-foreground">{t.dashboard.manage_trainings.title}</h1>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    <ViewToggle currentView={view} onViewChange={handleViewChange} />

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                // Calculate tomorrows date
                                const tomorrow = new Date()
                                tomorrow.setDate(tomorrow.getDate() + 1)
                                tomorrow.setHours(0, 0, 0, 0)
                                const nextDay = new Date(tomorrow)
                                nextDay.setDate(tomorrow.getDate() + 1)

                                // Filter trainings for tomorrow
                                const nextTrainings = trainings.filter(t => {
                                    const tDate = new Date(t.start_time)
                                    return tDate >= tomorrow && tDate < nextDay
                                }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

                                // Build the message
                                let msg = "¡Hola! Nuevos entrenamientos han sido programados para mañana:\n\n"

                                if (nextTrainings.length > 0) {
                                    nextTrainings.forEach(t => {
                                        const time = new Date(t.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        msg += `• ${t.title} - ${time}\n`
                                    })
                                } else {
                                    msg += "Revisa nuestro calendario para más detalles.\n"
                                }

                                msg += "\nYa puedes reservar tu cupo en el sitio web: https://olimpo-five.vercel.app/"

                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                            }}
                            className="bg-[#25D366] text-white hover:bg-[#20bd5a] border-none flex-1 sm:flex-none"
                        >
                            <WhatsAppIcon className="w-5 h-5 mr-2" />
                            <span className="hidden sm:inline">{t.dashboard.manage_trainings.announce_whatsapp}</span>
                            <span className="sm:hidden">WhatsApp</span>
                        </Button>
                        <Button onClick={() => openCreateModal()} className="flex-1 sm:flex-none">
                            {t.dashboard.manage_trainings.add_training}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="bg-card p-4 rounded-lg shadow ring-1 ring-border min-h-[600px]">
                {view === 'calendar' && (
                    <Calendar trainings={trainings} onTrainingClick={handleTrainingClick} onUpdate={fetchTrainings} onAddTraining={openCreateModal} />
                )}
                {view === 'list' && (
                    <ListView trainings={trainings} onTrainingClick={handleTrainingClick} isAdmin={true} />
                )}
                {view === 'grid' && (
                    <GridView trainings={trainings} onTrainingClick={handleTrainingClick} isAdmin={true} />
                )}
                {view === 'calendar' && (
                    <p className="mt-4 text-sm text-muted-foreground">{t.dashboard.manage_trainings.calendar_hint}</p>
                )}
            </div>

            {/* Create Training Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title={t.dashboard.manage_trainings.modal.title}>
                <form onSubmit={handleCreateTraining} className="space-y-4">
                    <Input placeholder={t.dashboard.manage_trainings.modal.training_title} value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                        <option value="Functional">Functional</option>
                        <option value="Yoga">Yoga</option>
                        <option value="Hyrox">Hyrox</option>
                        <option value="Crossfit">Crossfit</option>
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-muted-foreground">{t.dashboard.manage_trainings.modal.start_time}</label>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal pl-3",
                                            !formData.start_time && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                        {formData.start_time ? (
                                            format(new Date(formData.start_time), "PPP", { locale: t.dashboard.admin.payment_modal.title.includes("Payment") ? enUS : es })
                                        ) : (
                                            <span>Pick a date</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <DatePickerCalendar
                                        mode="single"
                                        selected={formData.start_time ? new Date(formData.start_time) : undefined}
                                        onSelect={(date) => {
                                            if (!date) return
                                            const current = new Date(formData.start_time || new Date())
                                            const newDate = new Date(
                                                date.getFullYear(),
                                                date.getMonth(),
                                                date.getDate(),
                                                current.getHours(),
                                                current.getMinutes()
                                            )
                                            setFormData({ ...formData, start_time: newDate.toISOString() })
                                            setIsCalendarOpen(false)
                                        }}
                                        initialFocus
                                        locale={t.dashboard.admin.payment_modal.title.includes("Payment") ? enUS : es}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs text-muted-foreground">Hora</label>
                            <Input
                                type="time"
                                value={formData.start_time ? format(new Date(formData.start_time), "HH:mm") : ""}
                                onChange={(e) => {
                                    const timeStr = e.target.value
                                    if (!timeStr) return
                                    const [hours, minutes] = timeStr.split(':').map(Number)
                                    const current = new Date(formData.start_time || new Date())
                                    const newDate = new Date(current)
                                    newDate.setHours(hours)
                                    newDate.setMinutes(minutes)
                                    setFormData({ ...formData, start_time: newDate.toISOString() })
                                }}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground">{t.dashboard.manage_trainings.modal.duration}</label>
                            <Input type="number" placeholder="Duration" value={formData.duration || ''} onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })} required />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground">{t.dashboard.manage_trainings.modal.capacity}</label>
                            <Input type="number" placeholder={t.dashboard.manage_trainings.modal.capacity} value={formData.capacity || ''} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>

                    {/* Coach Selection */}
                    <div>
                        <label className="text-xs text-muted-foreground">{t.dashboard.manage_trainings.modal.instructor}</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={formData.coach_id}
                            onChange={(e) => {
                                const selectedCoach = coaches.find(c => c.id === e.target.value)
                                setFormData({
                                    ...formData,
                                    coach_id: e.target.value,
                                    instructor: selectedCoach ? selectedCoach.name : ''
                                })
                            }}
                            required
                        >
                            <option value="">{t.dashboard.manage_trainings.modal.select_coach}</option>
                            {coaches.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.specialty})</option>
                            ))}
                        </select>
                    </div>
                    <Button type="submit" className="w-full">{t.dashboard.manage_trainings.modal.create_btn}</Button>
                </form>
            </Modal>

            {/* Participants Details Modal */}
            <Modal isOpen={isParticipantsModalOpen} onClose={() => setIsParticipantsModalOpen(false)} title="Detalles de la Clase">
                {selectedTraining && (
                    <div className="space-y-6">
                        <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
                            <h4 className="font-bold text-lg text-primary">{selectedTraining.title}</h4>
                            <div className="flex items-center text-sm text-primary/80 mt-1 gap-4">
                                <span className="flex items-center gap-1">
                                    <CalendarIcon className="w-4 h-4" />
                                    {format(new Date(selectedTraining.start_time), "PPP")}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    {participants.length} / {selectedTraining.capacity}
                                </span>
                            </div>
                        </div>

                        <div>
                            <h5 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-muted-foreground" />
                                Participantes Inscritos
                            </h5>

                            {loadingParticipants ? (
                                <div className="text-center py-8 text-muted-foreground">Cargando participantes...</div>
                            ) : participants.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                                    No hay participantes inscritos aún.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {participants.map((p) => (
                                        <div key={p.id} className="flex justify-between items-center p-3 hover:bg-muted/50 rounded-lg border border-border transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                                    {p.user?.full_name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground leading-none">{p.user?.full_name || 'Usuario desconocido'}</p>
                                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {p.user?.email}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono">
                                                {format(new Date(p.created_at), "h:mm a")}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-border">
                            <Button variant="destructive" size="sm" onClick={() => {
                                setIsParticipantsModalOpen(false)
                                handleDeleteTraining(selectedTraining.id)
                            }}>
                                {t.dashboard.manage_trainings.delete || "Eliminar Clase"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setIsParticipantsModalOpen(false)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
