"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Building2, ArrowRight, Loader2, Sparkles } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function WelcomePage() {
    const { user } = useAuth()
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)

    const handlePlayerChoice = async () => {
        if (!user) return
        setLoading('player')

        try {
            // 1. Mark onboarding as completed
            const { error } = await supabase
                .from('users')
                .update({ onboarding_status: 'completed' })
                .eq('id', user.id)

            if (error) throw error

            // 2. Redirect to Player Experience
            router.push('/player/explore')
            router.refresh()

        } catch (error: any) {
            console.error("Error setting up player profile:", error)
            toast({
                title: "Error",
                description: "Hubo un problema al guardar tu preferencia.",
                variant: "destructive"
            })
            setLoading(null)
        }
    }

    const handleBusinessChoice = () => {
        // Business onboarding handles its own state
        router.push('/register-business')
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden text-foreground">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/30 via-zinc-950 to-black z-0" />

            {/* Decorative Elements */}
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#ccff00]/10 rounded-full blur-3xl opacity-20 pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-20 pointer-events-none" />

            <div className="max-w-5xl w-full z-10 space-y-12">

                {/* Header */}
                <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-10 duration-700">
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
                        Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] to-emerald-400">PadelFlow</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto font-light">
                        La plataforma definitiva para el mundo del pádel. <br />
                        <span className="text-white font-medium">¿Cómo quieres usarla hoy?</span>
                    </p>
                </div>

                {/* Cards Container */}
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

                    {/* OPTION A: PLAYER */}
                    <div
                        className="group relative"
                        onClick={loading ? undefined : handlePlayerChoice}
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#ccff00] to-emerald-500 rounded-2xl opacity-20 group-hover:opacity-100 blur transition duration-500" />
                        <Card className="relative h-full bg-zinc-900/90 border-zinc-800 hover:bg-zinc-900 transition-all duration-300 cursor-pointer overflow-hidden transform group-hover:scale-[1.01]">
                            <CardHeader className="text-center pt-10 pb-2">
                                <div className="mx-auto bg-zinc-800 group-hover:bg-[#ccff00]/20 rounded-full p-6 w-24 h-24 flex items-center justify-center mb-6 transition-colors duration-300">
                                    <Trophy className="w-10 h-10 text-white group-hover:text-[#ccff00] transition-colors" />
                                </div>
                                <CardTitle className="text-3xl font-bold text-white mb-2">
                                    Soy Jugador
                                </CardTitle>
                                <CardDescription className="text-zinc-400 text-lg">
                                    Quiero reservar canchas, unirme a clases y jugar partidos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-center pb-10">
                                <ul className="space-y-3 mb-8 text-zinc-500 text-sm max-w-[200px] mx-auto text-left">
                                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-[#ccff00]" /> Reservas instantáneas</li>
                                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-[#ccff00]" /> Historial de partidos</li>
                                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-[#ccff00]" /> Comunidad de jugadores</li>
                                </ul>
                                <Button
                                    className="w-full max-w-xs bg-white text-black hover:bg-[#ccff00] hover:text-black font-semibold text-lg py-6 transition-all"
                                    disabled={!!loading}
                                >
                                    {loading === 'player' ? <Loader2 className="w-5 h-5 animate-spin" /> : "Comenzar como Jugador"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* OPTION B: BUSINESS */}
                    <div
                        className="group relative"
                        onClick={loading ? undefined : handleBusinessChoice}
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl opacity-20 group-hover:opacity-100 blur transition duration-500" />
                        <Card className="relative h-full bg-zinc-900/90 border-zinc-800 hover:bg-zinc-900 transition-all duration-300 cursor-pointer overflow-hidden transform group-hover:scale-[1.01]">
                            <CardHeader className="text-center pt-10 pb-2">
                                <div className="mx-auto bg-zinc-800 group-hover:bg-blue-500/20 rounded-full p-6 w-24 h-24 flex items-center justify-center mb-6 transition-colors duration-300">
                                    <Building2 className="w-10 h-10 text-white group-hover:text-blue-400 transition-colors" />
                                </div>
                                <CardTitle className="text-3xl font-bold text-white mb-2">
                                    Tengo un Club
                                </CardTitle>
                                <CardDescription className="text-zinc-400 text-lg">
                                    Gestiono un Club o Academia y quiero administrarlo con PadelFlow.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-center pb-10">
                                <ul className="space-y-3 mb-8 text-zinc-500 text-sm max-w-[200px] mx-auto text-left">
                                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-blue-400" /> Gestión de reservas</li>
                                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-blue-400" /> Automatización de pagos</li>
                                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-blue-400" /> Análisis de negocio</li>
                                </ul>
                                <Button
                                    className="w-full max-w-xs bg-zinc-800 text-white hover:bg-blue-600 font-semibold text-lg py-6 border border-zinc-700 hover:border-blue-500 transition-all"
                                    disabled={!!loading}
                                >
                                    Configurar mi Negocio
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    )
}
