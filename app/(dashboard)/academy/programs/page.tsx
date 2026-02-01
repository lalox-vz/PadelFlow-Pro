"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dumbbell, Users, Clock, Plus } from "lucide-react"

export default function AcademyProgramsPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Programas de Entrenamiento</h1>
                    <p className="text-muted-foreground">Diseña tus planes de clase y ofertas.</p>
                </div>
                <Button className="bg-indigo-600 text-white hover:bg-indigo-700">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Programa
                </Button>
            </div>

            <Tabs defaultValue="adults" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="adults">Adultos</TabsTrigger>
                    <TabsTrigger value="kids">Kids / Junior</TabsTrigger>
                    <TabsTrigger value="clinics">Clínicas</TabsTrigger>
                </TabsList>

                <TabsContent value="adults" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { name: "Iniciación (1.0 - 2.0)", sessions: "2x Semana", price: "$80/mes", students: 24, color: "bg-green-100 text-green-700" },
                            { name: "Intermedio (2.5 - 3.5)", sessions: "3x Semana", price: "$120/mes", students: 45, color: "bg-blue-100 text-blue-700" },
                            { name: "Avanzado / Competición", sessions: "4x Semana + Físico", price: "$180/mes", students: 12, color: "bg-purple-100 text-purple-700" },
                        ].map((prog, i) => (
                            <Card key={i} className="hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className={`w-fit px-2 py-1 rounded text-xs font-bold mb-2 ${prog.color}`}>
                                        Activo
                                    </div>
                                    <CardTitle>{prog.name}</CardTitle>
                                    <CardDescription>{prog.sessions}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Users className="h-4 w-4 mr-2" />
                                            {prog.students} Alumnos
                                        </div>
                                        <div className="font-bold text-lg">{prog.price}</div>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" className="w-full">Editar</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="kids" className="mt-6">
                    <div className="text-center py-10 bg-muted/30 rounded-lg border border-dashed">
                        <p className="text-muted-foreground">No hay programas para niños configurados aún.</p>
                        <Button variant="link" className="text-indigo-600">Crear Programa Junior</Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
