"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, GraduationCap, ArrowRight, Loader2, Check, X, Settings } from "lucide-react"

import { toast } from "@/hooks/use-toast"

export default function RegisterBusinessPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)
    const [existingEntities, setExistingEntities] = useState<any[]>([])
    const [checking, setChecking] = useState(true)

    // Check for existing entities to enforce strict "One-of-Each" rule
    useEffect(() => {
        const checkEntities = async () => {
            if (!user) return
            try {
                const { data } = await supabase
                    .from('entities')
                    .select('id, type, name, created_at')
                    .eq('owner_id', user.id)

                if (data) setExistingEntities(data)
            } catch (error) {
                console.error("Error checking entities:", error)
            } finally {
                setChecking(false)
            }
        }
        checkEntities()
    }, [user])

    const handleSelect = async (type: 'club' | 'academy') => {
        if (!user) return
        setLoading(type)

        try {
            // Check if business already exists, if so, upsert basic type?
            // Actually, just update the user's intent. The wizards handle the 'businesses' table creation.
            // Use RPC to bypass RLS issues securely
            const { error } = await supabase.rpc('update_user_onboarding', {
                p_business_type: type,
                p_status: 'in_progress',
                p_step: 1
            })

            if (error) throw error

            // Redirect to the respective wizard
            router.push(`/register-business/${type}`)
            router.refresh()

        } catch (error: any) {
            console.error("Error updating business type:", error)
            toast({
                title: "Error",
                description: "No se pudo actualizar el perfil: " + (error.message || "Error desconocido"),
                variant: "destructive"
            })
            setLoading(null)
        }
    }

    const handleExit = (destination: string) => {
        // Set session storage flag to prevent auto-redirect back to here from dashboard layout
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('skip_onboarding', 'true')
        }
        router.push(destination)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ccff00] to-transparent opacity-50" />

            {/* Exit Button (Top Right) */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
                onClick={() => handleExit('/')}
            >
                <X className="w-6 h-6" />
                <span className="sr-only">Cerrar</span>
            </Button>

            <div className="max-w-4xl w-full z-10 space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                        Bienvenido a <span className="text-[#ccff00]">PadelFlow</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Selecciona tu tipo de negocio para personalizar tu experiencia y configurar tu espacio de trabajo.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mt-12">
                    {checking ? (
                        <div className="col-span-2 flex justify-center items-center py-20">
                            <Loader2 className="w-12 h-12 text-[#ccff00] animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* CLUB CARD */}
                            {existingEntities.find(e => e.type === 'CLUB') ? (
                                (() => {
                                    // LOGIC: Distinguish between DRAFT and ACTIVE based on User Role
                                    const isClubOwner = user?.role === 'club_owner' || (user?.user_metadata as any)?.role === 'club_owner'
                                    const entityName = existingEntities.find(e => e.type === 'CLUB').name

                                    if (isClubOwner) {
                                        // ACTIVE STATE
                                        return (
                                            <Card
                                                className="group relative bg-[#ccff00]/10 border-[#ccff00] transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-2xl h-full"
                                                onClick={() => router.push('/club/dashboard')}
                                            >
                                                <div className="absolute inset-0 bg-[#ccff00]/5 group-hover:bg-[#ccff00]/10 transition-colors duration-300" />
                                                <CardHeader className="text-center pb-2 relative z-10">
                                                    <div className="mx-auto bg-[#ccff00] rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(204,255,0,0.3)]">
                                                        <Check className="w-10 h-10 text-black" />
                                                    </div>
                                                    <CardTitle className="text-2xl font-bold text-white">
                                                        {entityName}
                                                    </CardTitle>
                                                    <CardDescription className="text-[#ccff00]">
                                                        Club Registrado y Activo
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4 pt-4 text-center relative z-10">
                                                    <p className="text-sm text-zinc-400 max-w-[80%] mx-auto">
                                                        Tu club ya está configurado. Accede al panel para gestionar tus canchas.
                                                    </p>
                                                    <Button className="w-full mt-6 bg-[#ccff00] text-black hover:bg-[#b5952f]">
                                                        <Settings className="w-4 h-4 mr-2" /> Gestionar mi Club
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        )
                                    } else {
                                        // DRAFT STATE
                                        return (
                                            <Card
                                                className="group relative bg-zinc-900/80 border-dashed border-[#ccff00]/50 hover:border-[#ccff00] transition-all duration-300 cursor-pointer overflow-hidden h-full"
                                                onClick={() => router.push('/register-business/club')}
                                            >
                                                <CardHeader className="text-center pb-2 relative z-10">
                                                    <div className="mx-auto bg-zinc-800 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4 border border-[#ccff00]/30">
                                                        <Loader2 className="w-10 h-10 text-[#ccff00]" />
                                                    </div>
                                                    <CardTitle className="text-2xl font-bold text-white">
                                                        {entityName}
                                                    </CardTitle>
                                                    <CardDescription className="text-zinc-400">
                                                        Configuración Pendiente
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4 pt-4 text-center relative z-10">
                                                    <p className="text-sm text-zinc-500 max-w-[80%] mx-auto">
                                                        Tienes un borrador guardado. Continúa donde lo dejaste.
                                                    </p>
                                                    <Button className="w-full mt-6 bg-[#ccff00] text-black hover:bg-[#b5952f] font-bold shadow-[0_0_15px_rgba(204,255,0,0.2)]">
                                                        <ArrowRight className="w-4 h-4 mr-2" /> Continuar Configuración
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        )
                                    }
                                })()
                            ) : (
                                <Card
                                    className="group relative bg-card/50 backdrop-blur-sm border-muted hover:border-[#ccff00] transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1 hover:shadow-2xl h-full"
                                    onClick={() => handleSelect('club')}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#ccff00]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <CardHeader className="text-center pb-2">
                                        <div className="mx-auto bg-muted rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-muted group-hover:border-[#ccff00]/30">
                                            <Building2 className="w-10 h-10 text-[#ccff00]" />
                                        </div>
                                        <CardTitle className="text-2xl font-bold text-white group-hover:text-[#ccff00] transition-colors">
                                            Soy Dueño de Club
                                        </CardTitle>
                                        <CardDescription className="text-base">
                                            Gestiona canchas, reservas y pagos
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4 text-center">
                                        <ul className="space-y-2 text-sm text-left mx-auto max-w-[80%] text-muted-foreground">
                                            <li className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-green-500" /> Control total de canchas
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-green-500" /> Gestión de reservas simple
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-green-500" /> Reportes de ingresos
                                            </li>
                                        </ul>
                                        <Button
                                            className="w-full mt-6 bg-[#ccff00] text-black hover:bg-[#b5952f] transition-all"
                                            disabled={loading === 'club'}
                                        >
                                            {loading === 'club' ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <span className="flex items-center justify-center">
                                                    Seleccionar Club <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </span>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            {/* ACADEMY CARD */}
                            {existingEntities.find(e => e.type === 'ACADEMY') ? (
                                (() => {
                                    // LOGIC: Distinguish between DRAFT and ACTIVE based on User Role
                                    const isAcademyOwner = user?.role === 'academy_owner' || (user?.user_metadata as any)?.role === 'academy_owner'
                                    const entityName = existingEntities.find(e => e.type === 'ACADEMY').name

                                    if (isAcademyOwner) {
                                        return (
                                            <Card
                                                className="group relative bg-blue-500/10 border-blue-500 transition-all duration-300 cursor-pointer overflow-hidden hover:shadow-2xl h-full"
                                                onClick={() => router.push('/academy/dashboard')}
                                            >
                                                <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors duration-300" />
                                                <CardHeader className="text-center pb-2 relative z-10">
                                                    <div className="mx-auto bg-blue-500 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                                        <Check className="w-10 h-10 text-white" />
                                                    </div>
                                                    <CardTitle className="text-2xl font-bold text-white">
                                                        {entityName}
                                                    </CardTitle>
                                                    <CardDescription className="text-blue-400">
                                                        Academia Registrada y Activa
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4 pt-4 text-center relative z-10">
                                                    <p className="text-sm text-zinc-400 max-w-[80%] mx-auto">
                                                        Tu academia está lista. Gestiona tus alumnos y clases desde el dashboard.
                                                    </p>
                                                    <Button className="w-full mt-6 bg-blue-600 text-white hover:bg-blue-700">
                                                        <Settings className="w-4 h-4 mr-2" /> Gestionar mi Academia
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        )
                                    } else {
                                        return (
                                            <Card
                                                className="group relative bg-zinc-900/80 border-dashed border-blue-500/50 hover:border-blue-500 transition-all duration-300 cursor-pointer overflow-hidden h-full"
                                                onClick={() => router.push('/register-business/academy')}
                                            >
                                                <CardHeader className="text-center pb-2 relative z-10">
                                                    <div className="mx-auto bg-zinc-800 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4 border border-blue-500/30">
                                                        <Loader2 className="w-10 h-10 text-blue-500" />
                                                    </div>
                                                    <CardTitle className="text-2xl font-bold text-white">
                                                        {entityName}
                                                    </CardTitle>
                                                    <CardDescription className="text-zinc-400">
                                                        Configuración Pendiente
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="space-y-4 pt-4 text-center relative z-10">
                                                    <p className="text-sm text-zinc-500 max-w-[80%] mx-auto">
                                                        Tienes un borrador de academia. Continúa donde lo dejaste.
                                                    </p>
                                                    <Button className="w-full mt-6 bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                                        <ArrowRight className="w-4 h-4 mr-2" /> Continuar Configuración
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        )
                                    }
                                })()
                            ) : (
                                <Card
                                    className="group relative bg-card/50 backdrop-blur-sm border-muted hover:border-blue-500 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1 hover:shadow-2xl h-full"
                                    onClick={() => handleSelect('academy')}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <CardHeader className="text-center pb-2">
                                        <div className="mx-auto bg-muted rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-muted group-hover:border-blue-500/30">
                                            <GraduationCap className="w-10 h-10 text-blue-500" />
                                        </div>
                                        <CardTitle className="text-2xl font-bold text-white group-hover:text-blue-500 transition-colors">
                                            Director de Academia
                                        </CardTitle>
                                        <CardDescription className="text-base">
                                            Administra clases, alumnos y coaches
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-4 text-center">
                                        <ul className="space-y-2 text-sm text-left mx-auto max-w-[80%] text-muted-foreground">
                                            <li className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-green-500" /> Gestión de alumnos
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-green-500" /> Organización de clases
                                            </li>
                                            <li className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-green-500" /> Seguimiento de coaches
                                            </li>
                                        </ul>
                                        <Button
                                            className="w-full mt-6 bg-blue-600 text-white hover:bg-blue-700 transition-all"
                                            disabled={loading === 'academy'}
                                        >
                                            {loading === 'academy' ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <span className="flex items-center justify-center">
                                                    Seleccionar Academia <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </span>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>

                {/* Secondary Exit Link */}
                <div className="flex justify-center mt-8">
                    <button
                        onClick={() => handleExit('/player/explore')}
                        className="text-zinc-500 hover:text-white transition-colors text-sm font-medium"
                    >
                        Saltar por ahora, quiero explorar como jugador
                    </button>
                </div>
            </div>
        </div>
    )
}
