"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useWorkspace } from "@/context/WorkspaceContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Users,
    Search,
    Plus,
    TrendingUp,
    UserCheck,
    UserX,
    Mail,
    Phone,
    Calendar,
    Award,
    Filter,
    MoreVertical,
    Eye,
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
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import type { AcademyStudent } from "@/types/academy"
import { InviteStudent } from "@/components/academy/InviteStudent"

export default function StudentsPage() {
    const { user } = useAuth()
    const { activeWorkspace } = useWorkspace()
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [students, setStudents] = useState<AcademyStudent[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
    const [academyId, setAcademyId] = useState<string | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state for new student
    const [newStudent, setNewStudent] = useState<{
        full_name: string
        email: string
        phone: string
        program_id: string
        payment_status: 'paid' | 'pending' | 'overdue'
    }>({
        full_name: '',
        email: '',
        phone: '',
        program_id: '',
        payment_status: 'pending'
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

    // Fetch students
    useEffect(() => {
        const fetchStudents = async () => {
            if (!academyId) return

            setLoading(true)
            const { data, error } = await supabase
                .from('academy_students')
                .select('*')
                .eq('academy_id', academyId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching students:', error)
                toast({
                    title: "Error",
                    description: "No se pudieron cargar los alumnos",
                    variant: "destructive"
                })
            } else {
                setStudents(data || [])
            }
            setLoading(false)
        }

        fetchStudents()
    }, [academyId, toast])

    // Add student handler
    const handleAddStudent = async () => {
        if (!academyId || !newStudent.full_name) {
            toast({
                title: "Error",
                description: "El nombre es obligatorio",
                variant: "destructive"
            })
            return
        }

        setSubmitting(true)
        const { data, error } = await supabase
            .from('academy_students')
            .insert({
                academy_id: academyId,
                full_name: newStudent.full_name,
                email: newStudent.email || null,
                phone: newStudent.phone || null,
                payment_status: newStudent.payment_status,
                status: 'active'
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding student:', error)
            toast({
                title: "Error",
                description: "No se pudo agregar el alumno",
                variant: "destructive"
            })
        } else {
            setStudents(prev => [data, ...prev])
            setShowAddModal(false)
            setNewStudent({
                full_name: '',
                email: '',
                phone: '',
                program_id: '',
                payment_status: 'pending'
            })
            toast({
                title: "¡Éxito!",
                description: `${data.full_name} ha sido agregado`,
            })
        }
        setSubmitting(false)
    }

    // Filter logic
    const filteredStudents = students.filter(student => {
        const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesFilter = filterStatus === 'all' || student.status === filterStatus
        return matchesSearch && matchesFilter
    })

    // Calculate KPIs
    const totalStudents = students.length
    const activeStudents = students.filter(s => s.status === 'active').length
    const newThisMonth = students.filter(s => {
        const enrollDate = new Date(s.enrollment_date)
        const now = new Date()
        return enrollDate.getMonth() === now.getMonth() && enrollDate.getFullYear() === now.getFullYear()
    }).length
    const averageAttendance = students.reduce((acc, s) => acc + s.attendance_rate, 0) / students.length || 0

    return (
        <div className="space-y-6 p-6 animate-in fade-in duration-500">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                        <Users className="h-8 w-8 text-[#ccff00]" />
                        Gestión de Alumnos
                    </h1>
                    <p className="text-muted-foreground mt-1">Administra tu base de estudiantes</p>
                </div>
                <div className="flex gap-2">
                    {activeWorkspace && <InviteStudent academyId={activeWorkspace.entity_id} />}
                    <Button
                        className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-semibold"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Alumno
                    </Button>
                </div>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Alumnos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground">{totalStudents}</div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            {activeStudents} activos
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-transparent dark:from-green-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Nuevos este Mes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">+{newThisMonth}</div>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Crecimiento
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Asistencia Promedio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {averageAttendance.toFixed(0)}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            Última semana
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-transparent dark:from-orange-950/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Pagos Pendientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                            {students.filter(s => s.payment_status === 'pending' || s.payment_status === 'overdue').length}
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Requieren atención</p>
                    </CardContent>
                </Card>
            </div>

            {/* SEARCH & FILTER BAR */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={filterStatus === 'all' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('all')}
                        size="sm"
                    >
                        Todos
                    </Button>
                    <Button
                        variant={filterStatus === 'active' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('active')}
                        size="sm"
                    >
                        Activos
                    </Button>
                    <Button
                        variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                        onClick={() => setFilterStatus('inactive')}
                        size="sm"
                    >
                        Inactivos
                    </Button>
                </div>
            </div>

            {/* STUDENT CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-[#ccff00]" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="col-span-full text-center py-16 space-y-4">
                        <Users className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                        <p className="text-lg font-medium text-muted-foreground">
                            {searchQuery ? "No se encontraron resultados" : "No hay alumnos registrados"}
                        </p>
                        <Button
                            className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Primer Alumno
                        </Button>
                    </div>
                ) : (
                    filteredStudents.map(student => (
                        <Card key={student.id} className="hover:shadow-md transition-shadow group">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#ccff00] to-[#88aa00] flex items-center justify-center text-black font-bold text-lg">
                                            {student.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-foreground">{student.full_name}</h3>
                                            <Badge
                                                variant={
                                                    student.status === 'active' ? 'default' :
                                                        student.status === 'on_hold' ? 'secondary' :
                                                            'destructive'
                                                }
                                                className="text-xs mt-1"
                                            >
                                                {student.status === 'active' ? 'Activo' :
                                                    student.status === 'on_hold' ? 'En Pausa' :
                                                        'Inactivo'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <Eye className="h-4 w-4 mr-2" />
                                                Ver Perfil
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>Editar</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Archivar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {student.email && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-4 w-4" />
                                        <span className="truncate">{student.email}</span>
                                    </div>
                                )}
                                {student.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span>{student.phone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>Inscrito: {new Date(student.enrollment_date).toLocaleDateString('es-VE')}</span>
                                </div>

                                {/* Visual Indicators */}
                                <div className="pt-3 border-t border-border flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Asistencia</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                                                <div
                                                    className={`h-full ${student.attendance_rate >= 90 ? 'bg-green-500' :
                                                        student.attendance_rate >= 70 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                        }`}
                                                    style={{ width: `${student.attendance_rate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-semibold">{student.attendance_rate}%</span>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={
                                            student.payment_status === 'paid' ? 'default' :
                                                student.payment_status === 'pending' ? 'secondary' :
                                                    'destructive'
                                        }
                                    >
                                        {student.payment_status === 'paid' ? '✓ Pagado' :
                                            student.payment_status === 'pending' ? '⏳ Pendiente' :
                                                '⚠️ Vencido'}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* ADD STUDENT MODAL */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Nuevo Alumno</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-2">
                            Completa la información del estudiante. Podrás editar más detalles después.
                        </p>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre Completo *</Label>
                            <Input
                                id="name"
                                value={newStudent.full_name}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, full_name: e.target.value }))}
                                placeholder="Juan Pérez"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newStudent.email}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                                placeholder="juan@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Teléfono</Label>
                            <Input
                                id="phone"
                                value={newStudent.phone}
                                onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder="+58 412 123 4567"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment">Estado de Pago</Label>
                            <Select
                                value={newStudent.payment_status}
                                onValueChange={(value: 'paid' | 'pending' | 'overdue') =>
                                    setNewStudent(prev => ({ ...prev, payment_status: value }))
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paid">Pagado</SelectItem>
                                    <SelectItem value="pending">Pendiente</SelectItem>
                                    <SelectItem value="overdue">Vencido</SelectItem>
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
                            onClick={handleAddStudent}
                            disabled={submitting || !newStudent.full_name}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Agregando...
                                </>
                            ) : (
                                <>Agregar Alumno</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
