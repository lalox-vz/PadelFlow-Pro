"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowRight, Search, MapPin, CheckCircle2, Trophy, ShieldCheck, Zap } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function LandingPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const [searchType, setSearchType] = useState<'club' | 'academy'>('club')
    const [searchQuery, setSearchQuery] = useState('')

    // Redirect Logged In Users
    useEffect(() => {
        if (user && profile) {
            import("@/lib/role-navigation").then(({ getDashboardRoute }) => {
                const target = getDashboardRoute(profile.role)
                if (target && target !== '/') {
                    router.push(target)
                }
            })
        }
    }, [user, profile, router])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        // Improve: Pass query params to explore page
        router.push(`/player/explore?type=${searchType}&q=${encodeURIComponent(searchQuery)}`)
    }

    const handleStartJourney = (path: string) => {
        if (user) {
            router.push(path)
        } else {
            router.push('/signup')
        }
    }

    return (
        <div className="bg-background min-h-screen flex flex-col font-sans text-foreground">

            {/* 1. Hero Section (The Hook) */}
            <section className="relative h-[85vh] flex items-center justify-center overflow-hidden bg-gray-950">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    {/* Placeholder for high-quality dark padel court image */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626224583764-847890e058f5?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent"></div>
                </div>

                <div className="relative z-10 w-full max-w-5xl px-6 text-center space-y-8 animate-in fade-in zoom-in duration-700">
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight">
                            Domina la Cancha. <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ccff00] to-green-500">
                                Gestiona tu Pasión.
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto font-light">
                            La plataforma #1 en Venezuela para reservar canchas, unirte a academias y llevar tu nivel de Padel al siguiente nivel.
                        </p>
                    </div>

                    {/* Global Search Bar */}
                    <div className="max-w-2xl mx-auto bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl">
                        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                            {/* Toggle / Dropdownish */}
                            <div className="flex bg-black/40 rounded-xl p-1 relative">
                                <button
                                    type="button"
                                    onClick={() => setSearchType('club')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchType === 'club' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Clubes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSearchType('academy')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchType === 'academy' ? 'bg-[#ccff00] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Academias
                                </button>
                            </div>

                            <div className="flex-1 relative">
                                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <Input
                                    className="pl-10 h-10 md:h-full bg-white/10 border-0 text-white placeholder:text-gray-400 focus-visible:ring-[#ccff00] rounded-xl"
                                    placeholder={searchType === 'club' ? "Clubes populares en Caracas..." : "Entrenadores en Valencia..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-bold h-10 md:h-auto rounded-xl px-8"
                            >
                                <Search className="w-5 h-5 md:mr-2" /> <span className="hidden md:inline">Buscar</span>
                            </Button>
                        </form>
                    </div>
                </div>
            </section>

            {/* 2. Social Proof */}
            <section className="py-10 bg-gray-950 border-b border-gray-900">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-gray-500 text-sm uppercase tracking-widest font-semibold mb-6">Confían en nosotros</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Fake Logos for Design */}
                        <div className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="h-6 w-6" /> VEN PADEL</div>
                        <div className="text-xl font-bold text-white flex items-center gap-2"><Zap className="h-6 w-6" /> ACADEMY PRO</div>
                        <div className="text-xl font-bold text-white flex items-center gap-2"><MapPin className="h-6 w-6" /> CLUB CARACAS</div>
                        <div className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheck className="h-6 w-6" /> PADEL SEGURO</div>
                    </div>
                    <p className="mt-8 text-gray-400 text-sm">
                        Más de <span className="text-white font-bold">50+ Clubes</span> y <span className="text-white font-bold">12,000+ Jugadores</span> ya son parte de PadelFlow.
                    </p>
                </div>
            </section>

            {/* 3. Dual Path (The Split) */}
            <section className="py-24 bg-background relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 relative z-10">

                    {/* Player Card */}
                    <div className="group relative h-[500px] rounded-3xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-2" onClick={() => handleStartJourney('/player/explore')}>
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1599474924187-334a405be6b3?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-70 transition-opacity"></div>

                        <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                            <h3 className="text-3xl font-bold text-white mb-2">Quiero Jugar</h3>
                            <p className="text-gray-300 mb-6 line-clamp-2 group-hover:line-clamp-none transition-all">
                                Encuentra canchas disponibles, reserva en segundos y únete a la comunidad de jugadores más grande.
                            </p>
                            <Button className="w-full bg-white text-black hover:bg-gray-200 font-bold rounded-xl h-12">
                                Explorar Canchas <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Owner Card */}
                    <div className="group relative h-[500px] rounded-3xl overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-2 border-4 border-transparent hover:border-[#ccff00]/50" onClick={() => router.push('/register-business')}>
                        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>

                        <div className="absolute bottom-0 left-0 p-8 md:p-12 w-full">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-3xl font-bold text-white">Soy Dueño</h3>
                                <div className="px-2 py-1 rounded bg-[#ccff00] text-black text-xs font-bold uppercase">Negocios</div>
                            </div>
                            <p className="text-gray-300 mb-6">
                                Digitaliza tu club o academia. Gestiona reservas, automatiza pagos y crece tu negocio.
                            </p>
                            <Button className="w-full bg-[#ccff00] text-black hover:bg-[#b3e600] font-bold rounded-xl h-12">
                                Transformar mi Club <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                </div>
            </section>

            {/* 4. Feature Grid (Why PadelFlow) */}
            <section className="py-20 bg-muted/30">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-12">Todo lo que necesitas para tu Padel</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 bg-card rounded-2xl border border-border hover:shadow-lg transition-all">
                            <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-6 mx-auto">
                                <Zap className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Reservas Instantáneas</h3>
                            <p className="text-muted-foreground">Olvídate de llamar o escribir por WhatsApp. Mira disponibilidad real y reserva en un click.</p>
                        </div>
                        <div className="p-8 bg-card rounded-2xl border border-border hover:shadow-lg transition-all">
                            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 mx-auto">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Sube de Nivel</h3>
                            <p className="text-muted-foreground">Encuentra entrenadores y academias que se ajusten a tu nivel. Compite y mejora tu ranking.</p>
                        </div>
                        <div className="p-8 bg-card rounded-2xl border border-border hover:shadow-lg transition-all">
                            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-6 mx-auto">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Pagos Seguros</h3>
                            <p className="text-muted-foreground">Paga en Bs o Divisas de forma segura. Tu dinero y tus reservas están garantizados.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Business CTA */}
            <section className="py-24 bg-black text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-[#ccff00] rounded-full blur-[150px] opacity-10"></div>
                <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Transforma tu Club hoy mismo</h2>
                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                        Únete a la red de clubes más moderna de Venezuela. Sin costos de instalación, solo resultados.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button size="lg" className="h-14 px-8 text-lg font-bold bg-[#ccff00] text-black hover:bg-[#b3e600] rounded-full">
                            Registrar mi Negocio
                        </Button>
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-white/20 hover:bg-white/10 text-white rounded-full">
                            Agendar Demo
                        </Button>
                    </div>
                </div>
            </section>

        </div>
    )
}
