"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useWorkspace } from "@/context/WorkspaceContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    UserCheck,
    Plus,
    Trophy,
    Calendar,
    Users,
    Star,
    MoreVertical,
    Mail,
    Phone,
    TrendingUp,
    Loader2
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import type { AcademyCoach } from "@/types/academy"
import { InviteCoach } from "@/components/academy/InviteCoach"

interface CoachWithStats extends AcademyCoach {
    students_assigned: number
    classes_count: number
}

export default function CoachesPage() {
    const { user } = useAuth()
    const { activeWorkspace } = useWorkspace()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [coaches, setCoaches] = useState<CoachWithStats[]>([])
    const [academyId, setAcademyId] = useState<string | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [newCoach, setNewCoach] = useState<{
        name: string
        email: string
        phone: string
        specialty: string
        experience_years: number
        availability: 'full_time' | 'part_time' | 'substitute'
    }>({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        experience_years: 0,
        availability: 'full_time'
    })

    // Fetch academy ID
    useEffect(() => {
        const fetchAcademy = async () => {
            if (!user) return

            const { data, error } = await supabase
                .from('entities')
                .select('id')
                .eq('owner_id', user.id)
                .eq('type', 'ACADEMY')
                .single()

            if (data) {
                setAcademyId(data.id)
            } else if (error) {
                console.error('Error fetching academy:', error)
                toast({
                    title: "Error",
                    description: "No se pudo cargar la academia",
                    variant: "destructive"
                })
            }
        }

        fetchAcademy()
    }, [user, toast])

    // Fetch coaches with stats
    useEffect(() => {
        const fetchCoaches = async () => {
            if (!academyId) return

            setLoading(true)

            // Fetch coaches
            const { data: coachesData, error: coachesError } = await supabase
                .from('academy_coaches')
                .select('*')
                .eq('academy_id', academyId)
                .order('created_at', { ascending: false })

            if (coachesError) {
                console.error('Error fetching coaches:', coachesError)
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los coaches",
                    variant: "destructive"
                })
                setLoading(false)
                return
            }

            // Fetch classes count for each coach
            const coachesWithStats: CoachWithStats[] = await Promise.all(
                (coachesData || []).map(async (coach) => {
                    // Count classes for this coach
                    const { count: classesCount } = await supabase
                        .from('academy_classes')
                        .select('id', { count: 'exact', head: true })
                        .eq('coach_id', coach.id)
                        .eq('status', 'active')

                    // Count enrolled students across all their classes
                    const { data: enrollmentsData } = await supabase
                        .from('academy_classes')
                        .select('id')
                        .eq('coach_id', coach.id)
                        .eq('status', 'active')

                    const classIds = (enrollmentsData || []).map(c => c.id)

                    let studentsCount = 0
                    if (classIds.length > 0) {
                        const { count } = await supabase
                            .from('class_enrollments')
                            .select('student_id', { count: 'exact', head: true })
                            .in('class_id', classIds)
                            .eq('status', 'active')

                        studentsCount = count || 0
                    }

                    return {
                        ...coach,
                        students_assigned: studentsCount,
                        classes_count: classesCount || 0
                    }
                })
            )

            setCoaches(coachesWithStats)
            setLoading(false)
        }

        fetchCoaches()
    }, [academyId, toast])

    // Add coach handler
    const handleAddCoach = async () => {
        if (!academyId || !newCoach.name) {
            toast({
                title: "Error",
                description: "El nombre es obligatorio",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        const { data, error } = await supabase
            .from('academy_coaches')
            .insert({
                academy_id: academyId,
                name: newCoach.name,
                email: newCoach.email || null,
                phone: newCoach.phone || null,
                specialty: newCoach.specialty || null,
                experience_years: newCoach.experience_years,
                availability: newCoach.availability,
                status: 'active'
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding coach:', error)
            toast({
                title: "Error",
                description: "No se pudo agregar el coach",
                variant: "destructive"
            })
        } else {
            const newCoachWithStats: CoachWithStats = {
                ...data,
                students_assigned: 0,
                classes_count: 0
            }
            setCoaches(prev => [newCoachWithStats, ...prev])
            setShowAddModal(false)
            setNewCoach({
                name: '',
                email: '',
                phone: '',
                specialty: '',
                experience_years: 0,
                availability: 'full_time'
            })
            toast({
                title: "¡Éxito!",
                description: `${data.name} ha sido agregado al equipo`,
            })
        }
        setSubmitting(false)
    }

    const totalCoaches = coaches.length
    const activeCoaches = coaches.filter(c => c.status === 'active').length
    const totalStudents = coaches.reduce((acc, c) => acc + c.students_assigned, 0)
    const averageRating = coaches.reduce((acc, c) => acc + c.rating, 0) / coaches.length || 0

    return (
        <div className="space-y-6 p-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <UserCheck className="h-8 w-8 text-[#ccff00]" />
                        Coaches
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestiona tu equipo de entrenadores</p>
                </div>
                <div className="flex gap-2">
                    {activeWorkspace && <InviteCoach academyId={activeWorkspace.entity_id} />}
                    <Button
                        className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-semibold"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Contratar Coach
                    </Button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-[#ccff00]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Coaches</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalCoaches}</div>
                        <p className="text-xs text-muted-foreground mt-1">{activeCoaches} activos</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos Asignados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalStudents}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Promedio: {totalCoaches > 0 ? (totalStudents / totalCoaches).toFixed(0) : 0} por coach
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Rating Promedio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                            <Star className="h-6 w-6 fill-current" />
                            {averageRating.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Satisfacción alta</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Clases Activas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                            {coaches.reduce((acc, c) => acc + c.classes_count, 0)}
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Total programadas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* COACH CARDS */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Equipo Activo</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[#ccff00]" />
                    </div>
                ) : coaches.length === 0 ? (
                    <Card className="p-12 text-center">
                        <UserCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium text-muted-foreground mb-4">No hay coaches registrados</p>
                        <Button
                            className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Contratar Primer Coach
                        </Button>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {coaches.map(coach => (
                            <Card key={coach.id} className="hover:shadow-md transition-all hover:border-[#ccff00] group">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                        {/* Avatar & Name */}
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <Avatar className="h-16 w-16 ring-2 ring-[#ccff00]">
                                                <AvatarFallback className="bg-gradient-to-br from-[#ccff00] to-[#88aa00] text-black font-bold text-xl">
                                                    {coach.name.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-lg text-foreground">{coach.name}</h3>
                                                <p className="text-sm text-muted-foreground">{coach.specialty || 'Sin especialidad'}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Trophy className="h-3 w-3 text-[#ccff00]" />
                                                        {coach.experience_years} años
                                                    </span>
                                                    <Badge variant={coach.availability === 'full_time' ? 'default' : 'secondary'} className="text-xs">
                                                        {coach.availability === 'full_time' ? 'Tiempo Completo' :
                                                            coach.availability === 'part_time' ? 'Medio Tiempo' :
                                                                'Suplente'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-3 gap-6 pl-6 border-l border-border">
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                                                    <Star className="h-4 w-4 fill-current" />
                                                    <span className="font-bold text-foreground">{coach.rating}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Rating</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                    <Users className="h-4 w-4 text-blue-500" />
                                                    <span className="font-bold text-foreground">{coach.students_assigned}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Alumnos</p>
                                            </div>
                                            <div className="text-center">
                                                <div className="flex items-center justify-center gap-1 mb-1">
                                                    <Calendar className="h-4 w-4 text-green-500" />
                                                    <span className="font-bold text-foreground">{coach.classes_count}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Clases</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm">Ver Perfil</Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>Editar Información</DropdownMenuItem>
                                                    <DropdownMenuItem>Asignar Alumnos</DropdownMenuItem>
                                                    <DropdownMenuItem>Ver Horario</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600">Desactivar</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>

                                    {/* Expandable Contact Info */}
                                    <details className="mt-4 pt-4 border-t border-border">
                                        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-2">
                                            <span>Información de Contacto</span>
                                        </summary>
                                        <div className="mt-3 space-y-2 text-sm">
                                            {coach.email && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Mail className="h-4 w-4" />
                                                    <a href={`mailto:${coach.email}`} className="hover:text-[#ccff00]">{coach.email}</a>
                                                </div>
                                            )}
                                            {coach.phone && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Phone className="h-4 w-4" />
                                                    <a href={`tel:${coach.phone}`} className="hover:text-[#ccff00]">{coach.phone}</a>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* ADD COACH MODAL */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Contratar Nuevo Coach</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                            Completa la información del entrenador. Podrás editar más detalles después.
                        </p>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="coach-name">Nombre Completo *</Label>
                            <Input
                                id="coach-name"
                                value={newCoach.name}
                                onChange={(e) => setNewCoach(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Carlos Martínez"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coach-email">Email</Label>
                            <Input
                                id="coach-email"
                                type="email"
                                value={newCoach.email}
                                onChange={(e) => setNewCoach(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="carlos@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coach-phone">Teléfono</Label>
                            <Input
                                id="coach-phone"
                                value={newCoach.phone}
                                onChange={(e) => setNewCoach(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+58 412 888 9999"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coach-specialty">Especialidad</Label>
                            <Input
                                id="coach-specialty"
                                value={newCoach.specialty}
                                onChange={(e) => setNewCoach(prev => ({ ...prev, specialty: e.target.value }))}
                                placeholder="Técnica Avanzada"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="coach-experience">Años de Experiencia</Label>
                                <Input
                                    id="coach-experience"
                                    type="number"
                                    min="0"
                                    value={newCoach.experience_years}
                                    onChange={(e) => setNewCoach(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="coach-availability">Disponibilidad</Label>
                                <Select
                                    value={newCoach.availability}
                                    onValueChange={(value: 'full_time' | 'part_time' | 'substitute') =>
                                        setNewCoach(prev => ({ ...prev, availability: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full_time">Tiempo Completo</SelectItem>
                                        <SelectItem value="part_time">Medio Tiempo</SelectItem>
                                        <SelectItem value="substitute">Suplente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                            onClick={handleAddCoach}
                            disabled={submitting || !newCoach.name}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Agregando...
                                </>
                            ) : (
                                <>Contratar Coach</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
