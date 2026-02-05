"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import { signupAction } from "./actions"

export default function SignupPage() {
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [fullName, setFullName] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData()
        formData.append("email", email)
        formData.append("password", password)
        formData.append("fullName", fullName)
        formData.append("isBusinessSignup", "false") // Deprecate explicit checkbox, default to false. The Welcome flow handles intent.

        const result = await signupAction(null, formData)

        if (result?.error) {
            console.error("Signup error:", result.error)
            let msg = ""
            if (result.error.includes("already registered")) {
                msg = t.auth.errors.email_taken
            } else if (result.error.includes("weak")) {
                msg = t.auth.errors.weak_password
            } else {
                msg = `${t.auth.errors.unknown} (${result.error})`
            }

            toast({
                title: "Error de Registro",
                description: msg,
                variant: "destructive",
            })
            setLoading(false)
        } else {
            toast({
                title: language === 'es' ? "¡Cuenta creada!" : "Account Created!",
                description: language === 'es'
                    ? "¡Bienvenido a PadelFlow! Tu cuenta está lista."
                    : "Welcome to PadelFlow! Your account is ready.",
                className: "bg-[#ccff00] text-black border-none"
            })

            // Force redirection to Welcome Page (or let the login flow logic handle it)
            // But since signup auto-signs in usually, we can direct to Welcome.
            // Our previous Logic updates made sure that NEW users will have onboarding_status = 'not_started'
            // and role-navigation will catch them.
            // However, explicit redirect is safer UX.
            window.location.assign("/welcome")
        }
    }

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-black">
            {/* Visual Side (Left) */}
            <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-zinc-900 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />
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
                            "Descubre la nueva era del pádel. Únete a una comunidad global apasionada por el deporte."
                        </p>
                    </blockquote>
                </div>
            </div>

            {/* Form Side (Right) */}
            <div className="flex items-center justify-center py-12 px-6 lg:px-8 bg-black text-white">
                <div className="mx-auto grid w-full max-w-[400px] gap-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-3xl font-semibold tracking-tight">Crear Cuenta</h1>
                        <p className="text-sm text-zinc-400">
                            Ingresa tus datos para comenzar
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="grid gap-4">
                        <div className="grid gap-2">
                            <Input
                                id="fullName"
                                placeholder="Nombre completo"
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 focus:border-[#ccff00] h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Input
                                id="email"
                                placeholder="Correo electrónico"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-zinc-900 border-zinc-800 focus:border-[#ccff00] h-11"
                            />
                        </div>
                        <div className="grid gap-2 relative">
                            <Input
                                id="password"
                                placeholder="Contraseña"
                                type={showPassword ? "text" : "password"}
                                required
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

                        <Button
                            disabled={loading}
                            className="bg-[#ccff00] text-black hover:bg-[#b5952f] font-semibold h-11 mt-2"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                "Registrarse"
                            )}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-black px-2 text-zinc-500">
                                ¿Ya tienes cuenta?
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center text-sm font-medium text-white hover:text-[#ccff00] transition-colors group"
                        >
                            Iniciar Sesión
                            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
