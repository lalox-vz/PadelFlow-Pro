"use client"

import { useAuth } from "@/context/AuthContext"
import { useWorkspace } from "@/context/WorkspaceContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Dumbbell, Calendar, GraduationCap, Trophy } from "lucide-react"
import { RequestClubHosting } from "@/components/academy/RequestClubHosting"

export default function AcademyDashboardPage() {
    const { user } = useAuth()
    const { activeWorkspace } = useWorkspace()

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Mi Academia</h1>
                    <p className="text-muted-foreground">Gestiona tus alumnos, clases y entrenadores.</p>
                </div>
                {activeWorkspace && (
                    <RequestClubHosting academyId={activeWorkspace.entity_id} />
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-t-4 border-t-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Alumnos Activos</CardTitle>
                        <GraduationCap className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">128</div>
                        <p className="text-xs text-muted-foreground">+8 este mes</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clases Semanales</CardTitle>
                        <Calendar className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">45</div>
                        <p className="text-xs text-muted-foreground">92% Tasa de asistencia</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Entrenadores</CardTitle>
                        <Dumbbell className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">6</div>
                        <p className="text-xs text-muted-foreground">3 Senior, 3 Junior</p>
                    </CardContent>
                </Card>
                <Card className="border-t-4 border-t-indigo-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nivel Promedio</CardTitle>
                        <Trophy className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3.5</div>
                        <p className="text-xs text-muted-foreground">Categoría C</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Clases de Hoy</CardTitle>
                        <CardDescription>Agenda de entrenamientos del día.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { time: "08:00 AM", level: "Nivel 2.0 (Básico)", coach: "Miguel", students: "4/4" },
                                { time: "09:30 AM", level: "Nivel 3.5 (Intermedio)", coach: "Miguel", students: "3/4" },
                                { time: "04:00 PM", level: "Academia Kids", coach: "Laura", students: "6/8" },
                                { time: "06:00 PM", level: "Alta Competencia", coach: "Carlos", students: "4/4" },
                            ].map((session, i) => (
                                <div key={i} className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0">
                                    <div>
                                        <p className="font-semibold text-foreground">{session.level}</p>
                                        <p className="text-sm text-muted-foreground">Coach: {session.coach}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-indigo-600">{session.time}</div>
                                        <div className="text-xs text-muted-foreground">{session.students} Cupos</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Progreso de Alumnos</CardTitle>
                        <CardDescription>Estudiantes destacados de la semana.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "Juan Pérez", from: "3.0", to: "3.5", note: "Mejoró bandeja" },
                                { name: "Maria Rodriguez", from: "2.5", to: "3.0", note: "Ganó torneo interno" },
                                { name: "Pedro Gomez", from: "4.0", to: "4.0", note: "Mantiene consistencia" },
                            ].map((student, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-foreground">{student.name}</p>
                                        <p className="text-xs text-muted-foreground">{student.note}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <span className="text-gray-400">{student.from}</span>
                                        <span className="text-indigo-500">→</span>
                                        <span className="text-green-600">{student.to}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
