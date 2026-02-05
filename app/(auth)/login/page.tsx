"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import { useToast } from "@/hooks/use-toast"
import { getDashboardRoute } from "@/lib/role-navigation"

export default function LoginPage() {
    const { t } = useLanguage()
    const { toast } = useToast()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })

            if (error) throw error

            // Enhanced Redirect Logic based on Role and Onboarding Status
            const { data: { user } } = await supabase.auth.getUser()

            // Fetch fresh profile data to check onboarding status
            const { data: profile } = await supabase
                .from('users')
                .select('role, onboarding_status')
                .eq('id', user?.id)
                .single()

            const role = profile?.role || user?.user_metadata?.role
            const onboardingStatus = profile?.onboarding_status || 'completed'

            const target = getDashboardRoute(role, onboardingStatus)
            router.push(target)
            router.refresh()

        } catch (error: any) {
            console.error("Login Error:", error)
            let msg = t.auth.errors.unknown
            const errLower = error.message.toLowerCase()

            if (errLower.includes('invalid login') || errLower.includes('invalid email')) {
                msg = "Credenciales incorrectas. Verifica tu correo y contraseña."
            } else if (errLower.includes('email not found')) {
                msg = "No encontramos una cuenta con este correo."
            }

            toast({
                title: "Error de Acceso",
                description: msg,
                variant: "destructive",
            })
            setLoading(false)
        }
    }

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-black">
            {/* Visual Side (Left) */}
            <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-zinc-900 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626245550266-9b049d4791e8?q=80&w=2672&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-[#ccff00] rounded-full flex items-center justify-center">
                            <div className="h-3 w-3 bg-black rounded-full" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">PadelFlow</h1>
                    </div>
                </div>

                <div className="relative z-10 space-y-6 max-w-lg">
                    <blockquote className="space-y-2">
                        <p className="text-2xl font-medium leading-relaxed">
                            "La plataforma que transformó la gestión de nuestro club. Dejamos de perder horas en WhatsApp y nos enfocamos en el juego."
                        </p>
                        <footer className="text-sm text-zinc-400 font-medium">Sofía R., Gerente de Operaciones</footer>
                    </blockquote>
                </div>
            </div>

            {/* Form Side (Right) */}
            <div className="flex items-center justify-center py-12 px-6 lg:px-8 bg-black text-white">
                <div className="mx-auto grid w-full max-w-[400px] gap-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-3xl font-semibold tracking-tight">Bienvenido de vuelta</h1>
                        <p className="text-sm text-zinc-400">
                            Ingresa tus credenciales para acceder a tu cuenta
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="grid gap-4">
                        <div className="grid gap-2">
                            <Input
                                id="email"
                                placeholder="nombre@ejemplo.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect="off"
                                disabled={loading}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 focus:border-[#ccff00] h-11"
                            />
                        </div>
                        <div className="grid gap-2 relative">
                            <Input
                                id="password"
                                placeholder="Tu contraseña"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                disabled={loading}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 focus:border-[#ccff00] h-11 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent text-zinc-400 hover:text-white transition-colors"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>

                        <div className="flex items-center justify-end">
                            <Link
                                href="/forgot-password"
                                className="text-xs font-medium text-[#ccff00] hover:text-[#b3e600] hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <Button
                            disabled={loading}
                            className="bg-[#ccff00] text-black hover:bg-[#b5952f] font-semibold h-11"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                "Iniciar Sesión"
                            )}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-black px-2 text-zinc-500">
                                ¿No tienes cuenta?
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <Link
                            href="/signup"
                            className="inline-flex items-center justify-center text-sm font-medium text-white hover:text-[#ccff00] transition-colors group"
                        >
                            Crear una cuenta nueva
                            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
