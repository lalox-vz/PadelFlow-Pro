"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Calendar as CalendarIcon,
    Plus,
    ChevronLeft,
    ChevronRight,
    Clock,
    Users,
    User,
    Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { AcademyClass, AcademyCoach } from "@/types/academy"

const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
    const hour = 7 + i
    return `${hour.toString().padStart(2, '0')}:00`
})

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const COLOR_OPTIONS = [
    { value: 'blue', label: 'Azul', sample: 'bg-blue-500' },
    { value: 'purple', label: 'Morado', sample: 'bg-purple-500' },
    { value: 'green', label: 'Verde', sample: 'bg-green-500' },
    { value: 'orange', label: 'Naranja', sample: 'bg-orange-500' },
    { value: 'red', label: 'Rojo', sample: 'bg-red-500' },
]

interface ClassWithCoach extends AcademyClass {
    coach_name?: string
}

export default function SchedulePage() {
    const { user } = useAuth()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [currentWeek, setCurrentWeek] = useState(new Date())
    const [classes, setClasses] = useState<ClassWithCoach[]>([])
    const [coaches, setCoaches] = useState<AcademyCoach[]>([])
    const [courts, setCourts] = useState<Array<{ id: string, name: string }>>([])
    const [selectedCoach, setSelectedCoach] = useState<string>('all')
    const [academyId, setAcademyId] = useState<string | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state for new class
    const [newClass, setNewClass] = useState({
        title: '',
        coach_id: '',
        court_id: '',
        day_of_week: 0,
        start_time: '09:00',
        duration_minutes: 60,
        max_students: 15,
        color: 'blue'
    })

    // Fetch academy ID
    useEffect(() => {
        const fetchAcademy = async () => {
            if (!user) return

            const { data } = await supabase
                .from('entities')
                .select('id')
                .eq('owner_id', user.id)
                .eq('type', 'ACADEMY')
                .single()

            if (data) setAcademyId(data.id)
        }

        fetchAcademy()
    }, [user])

    // Fetch coaches, courts from host club, and classes
    useEffect(() => {
        const fetchData = async () => {
            if (!academyId) return

            setLoading(true)

            // First, get the academy's host club ID
            const { data: academyData } = await supabase
                .from('entities')
                .select('host_club_id')
                .eq('id', academyId)
                .single()

            if (!academyData?.host_club_id) {
                toast({
                    title: "Error de configuración",
                    description: "Esta academia no está vinculada a un club. Por favor contacta al administrador.",
                    variant: "destructive"
                })
                setLoading(false)
                return
            }

            // Fetch courts from the HOST CLUB
            const { data: courtsData } = await supabase
                .from('courts')
                .select('id, name')
                .eq('club_id', academyData.host_club_id)
                .order('name')

            setCourts(courtsData || [])

            // Fetch coaches for filter
            const { data: coachesData } = await supabase
                .from('academy_coaches')
                .select('*')
                .eq('academy_id', academyId)
                .eq('status', 'active')

            setCoaches(coachesData || [])

            // Fetch classes with coach info
            const { data: classesData, error } = await supabase
                .from('academy_classes')
                .select(`
                    *,
                    coach:academy_coaches(name)
                `)
                .eq('academy_id', academyId)
                .eq('status', 'active')

            if (error) {
                console.error('Error fetching classes:', error)
                toast({
                    title: "Error",
                    description: "No se pudieron cargar las clases",
                    variant: "destructive"
                })
            } else {
                const classesWithCoachName = (classesData || []).map(c => ({
                    ...c,
                    coach_name: Array.isArray(c.coach) ? c.coach[0]?.name : c.coach?.name
                }))
                setClasses(classesWithCoachName)
            }

            setLoading(false)
        }

        fetchData()
    }, [academyId, toast])

    // Add class handler
    const handleAddClass = async () => {
        if (!academyId || !newClass.title) {
            toast({
                title: "Error",
                description: "El título es obligatorio",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        const { data, error } = await supabase
            .from('academy_classes')
            .insert({
                academy_id: academyId,
                title: newClass.title,
                coach_id: newClass.coach_id || null,
                court_id: newClass.court_id || null,
                day_of_week: newClass.day_of_week,
                start_time: newClass.start_time,
                duration_minutes: newClass.duration_minutes,
                max_students: newClass.max_students,
                color: newClass.color,
                status: 'active',
                recurring: true
            })
            .select(`
                *,
                coach:academy_coaches(name)
            `)
            .single()

        if (error) {
            console.error('Error adding class:', error)
            toast({
                title: "Error",
                description: "No se pudo agregar la clase",
                variant: "destructive"
            })
        } else {
            const newClassWithCoachName = {
                ...data,
                coach_name: Array.isArray(data.coach) ? data.coach[0]?.name : data.coach?.name
            }
            setClasses(prev => [...prev, newClassWithCoachName])
            setShowAddModal(false)
            setNewClass({
                title: '',
                coach_id: '',
                court_id: '',
                day_of_week: 0,
                start_time: '09:00',
                duration_minutes: 60,
                max_students: 15,
                color: 'blue'
            })
            toast({
                title: "¡Éxito!",
                description: `${data.title} ha sido agregada al calendario`,
            })
        }
        setSubmitting(false)
    }

    const filteredClasses = selectedCoach === 'all'
        ? classes
        : classes.filter(c => c.coach_id === selectedCoach)

    const getWeekDates = (date: Date) => {
        const dates = []
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay() + 1)

        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek)
            day.setDate(startOfWeek.getDate() + i)
            dates.push(day)
        }
        return dates
    }

    const weekDates = getWeekDates(currentWeek)

    const nextWeek = () => {
        const next = new Date(currentWeek)
        next.setDate(currentWeek.getDate() + 7)
        setCurrentWeek(next)
    }

    const prevWeek = () => {
        const prev = new Date(currentWeek)
        prev.setDate(currentWeek.getDate() - 7)
        setCurrentWeek(prev)
    }

    const classColor = (color: string) => {
        const colors = {
            blue: 'bg-blue-500/20 border-l-blue-500 text-blue-700 dark:text-blue-300',
            purple: 'bg-purple-500/20 border-l-purple-500 text-purple-700 dark:text-purple-300',
            green: 'bg-green-500/20 border-l-green-500 text-green-700 dark:text-green-300',
            orange: 'bg-orange-500/20 border-l-orange-500 text-orange-700 dark:text-orange-300',
            red: 'bg-red-500/20 border-l-red-500 text-red-700 dark:text-red-300',
        }
        return colors[color as keyof typeof colors] || colors.blue
    }

    return (
        <div className="space-y-6 p-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <CalendarIcon className="h-8 w-8 text-[#ccff00]" />
                        Horarios
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestiona el calendario de clases</p>
                </div>
                <Button
                    className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-semibold"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Clase
                </Button>
            </div>

            {/* CONTROLS */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={prevWeek}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center min-w-[200px]">
                        <p className="font-semibold text-foreground">
                            {weekDates[0].toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {weekDates[0].getDate()} - {weekDates[6].getDate()}
                        </p>
                    </div>
                    <Button variant="outline" size="icon" onClick={nextWeek}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                        Hoy
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <Select value={selectedCoach} onValueChange={setSelectedCoach}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por coach" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Coaches</SelectItem>
                            {coaches.map(coach => (
                                <SelectItem key={coach.id} value={coach.id}>
                                    {coach.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* CALENDAR GRID */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#ccff00]" />
                </div>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[900px]">
                            <div className="grid grid-cols-8 border-b border-border bg-muted/30">
                                <div className="p-3 text-sm font-medium text-muted-foreground border-r border-border">
                                    Hora
                                </div>
                                {weekDates.map((date, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 text-center border-r border-border last:border-r-0 ${date.toDateString() === new Date().toDateString()
                                            ? 'bg-[#ccff00]/10'
                                            : ''
                                            }`}
                                    >
                                        <div className="font-semibold text-foreground">{DAYS_OF_WEEK[idx]}</div>
                                        <div className={`text-sm ${date.toDateString() === new Date().toDateString()
                                            ? 'text-[#ccff00] font-bold'
                                            : 'text-muted-foreground'
                                            }`}>
                                            {date.getDate()}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="relative">
                                {TIME_SLOTS.map((time) => (
                                    <div key={time} className="grid grid-cols-8 border-b border-border min-h-[80px]">
                                        <div className="p-3 text-sm text-muted-foreground border-r border-border bg-muted/10">
                                            {time}
                                        </div>

                                        {Array.from({ length: 7 }).map((_, dayIdx) => {
                                            const dayClasses = filteredClasses.filter(c =>
                                                c.day_of_week === dayIdx && c.start_time === time
                                            )

                                            return (
                                                <div
                                                    key={dayIdx}
                                                    className="border-r border-border last:border-r-0 p-1 hover:bg-muted/20 transition-colors cursor-pointer relative"
                                                >
                                                    {dayClasses.map(classSession => (
                                                        <div
                                                            key={classSession.id}
                                                            className={`p-2 rounded border-l-4 ${classColor(classSession.color)} mb-1 hover:shadow-md transition-shadow group cursor-pointer`}
                                                            style={{
                                                                minHeight: `${(classSession.duration_minutes / 60) * 60}px`
                                                            }}
                                                        >
                                                            <p className="font-semibold text-xs mb-1 leading-tight">
                                                                {classSession.title}
                                                            </p>
                                                            <div className="text-[10px] space-y-0.5 opacity-80">
                                                                {classSession.coach_name && (
                                                                    <div className="flex items-center gap-1">
                                                                        <User className="h-3 w-3" />
                                                                        <span className="truncate">{classSession.coach_name}</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-center gap-1">
                                                                    <Users className="h-3 w-3" />
                                                                    <span>{classSession.current_students}/{classSession.max_students}</span>
                                                                    <Badge
                                                                        variant={classSession.current_students >= classSession.max_students * 0.9 ? 'destructive' : 'secondary'}
                                                                        className="text-[8px] px-1 py-0"
                                                                    >
                                                                        {classSession.current_students >= classSession.max_students ? 'Llena' :
                                                                            classSession.current_students >= classSession.max_students * 0.75 ? 'Casi llena' :
                                                                                'Disponible'}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>{classSession.duration_minutes}min</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* SUMMARY STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Clases Totales</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{filteredClasses.length}</p>
                            </div>
                            <CalendarIcon className="h-8 w-8 text-[#ccff00]" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Estudiantes Totales</p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {filteredClasses.reduce((acc, c) => acc + c.current_students, 0)}
                                </p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Ocupación Promedio</p>
                                <p className="text-2xl font-bold text-foreground mt-1">
                                    {filteredClasses.length > 0
                                        ? ((filteredClasses.reduce((acc, c) => acc + c.current_students, 0) /
                                            filteredClasses.reduce((acc, c) => acc + c.max_students, 0)) * 100).toFixed(0)
                                        : 0}%
                                </p>
                            </div>
                            <svg className="h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                                <polyline points="16 7 22 7 22 13"></polyline>
                            </svg>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {filteredClasses.length === 0 && !loading && (
                <Card className="p-12 text-center">
                    <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground mb-2">No hay clases programadas</p>
                    <p className="text-sm text-muted-foreground mb-4">
                        Haz clic en "Agregar Clase" para comenzar
                    </p>
                    <Button
                        className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Primera Clase
                    </Button>
                </Card>
            )}

            {/* ADD CLASS MODAL */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Nueva Clase</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="class-title">Título de la Clase *</Label>
                            <Input
                                id="class-title"
                                value={newClass.title}
                                onChange={(e) => setNewClass(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ej: Técnica Avanzada"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="class-day">Día de la Semana</Label>
                                <Select
                                    value={newClass.day_of_week.toString()}
                                    onValueChange={(value) => setNewClass(prev => ({ ...prev, day_of_week: parseInt(value) }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DAYS_OF_WEEK.map((day, idx) => (
                                            <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class-time">Hora de Inicio</Label>
                                <Select
                                    value={newClass.start_time}
                                    onValueChange={(value) => setNewClass(prev => ({ ...prev, start_time: value }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIME_SLOTS.map(time => (
                                            <SelectItem key={time} value={time}>{time}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="class-duration">Duración (minutos)</Label>
                                <Input
                                    id="class-duration"
                                    type="number"
                                    step="15"
                                    value={newClass.duration_minutes}
                                    onChange={(e) => setNewClass(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class-max">Máximo Alumnos</Label>
                                <Input
                                    id="class-max"
                                    type="number"
                                    value={newClass.max_students}
                                    onChange={(e) => setNewClass(prev => ({ ...prev, max_students: parseInt(e.target.value) || 15 }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="class-coach">Coach (Opcional)</Label>
                            <Select
                                value={newClass.coach_id}
                                onValueChange={(value) => setNewClass(prev => ({ ...prev, coach_id: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sin asignar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Sin asignar</SelectItem>
                                    {coaches.map(coach => (
                                        <SelectItem key={coach.id} value={coach.id}>
                                            {coach.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="class-court">Cancha *</Label>
                            <Select
                                value={newClass.court_id}
                                onValueChange={(value) => setNewClass(prev => ({ ...prev, court_id: value }))}
                            >
                                <SelectTrigger className={!newClass.court_id ? 'border-[#ccff00]' : ''}>
                                    <SelectValue placeholder="Selecciona una cancha" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courts.length === 0 ? (
                                        <SelectItem value="none" disabled>Cargando canchas...</SelectItem>
                                    ) : (
                                        courts.map(court => (
                                            <SelectItem key={court.id} value={court.id}>
                                                {court.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Canchas del club anfitrión
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="class-color">Color</Label>
                            <Select
                                value={newClass.color}
                                onValueChange={(value) => setNewClass(prev => ({ ...prev, color: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {COLOR_OPTIONS.map(color => (
                                        <SelectItem key={color.value} value={color.value}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded ${color.sample}`} />
                                                <span>{color.label}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                            onClick={handleAddClass}
                            disabled={submitting || !newClass.title}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Agregando...
                                </>
                            ) : (
                                <>Agregar Clase</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
