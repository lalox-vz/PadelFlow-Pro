"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import Link from "next/link"
import { Loader2, ArrowLeft, MailCheck } from "lucide-react"

export default function ForgotPasswordPage() {
    const { toast } = useToast()
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return
        setLoading(true)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            })

            if (error) throw error

            setSubmitted(true)
            toast({
                title: "Correo enviado",
                description: "Si el correo existe, recibirás un enlace de recuperación.",
                className: "bg-[#ccff00] text-black border-none"
            })

        } catch (error: any) {
            console.error(error)
            let msg = error.message || "Ocurrió un error al intentar enviar el correo."

            // Translate common errors
            if (msg.includes("limit") || msg.includes("rate")) {
                msg = "Demasiados intentos. Por favor espera unos minutos antes de intentar de nuevo."
            }

            toast({
                title: "Error",
                description: msg,
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2 bg-black">
            {/* Visual Side (Left) */}
            <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-zinc-900 text-white">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1599474924187-334a405be631?q=80&w=2670&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay" />
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
                            "Recupera el acceso a tu cuenta y vuelve a la cancha en segundos."
                        </p>
                    </blockquote>
                </div>
            </div>

            {/* Form Side (Right) */}
            <div className="flex items-center justify-center py-12 px-6 lg:px-8 bg-black text-white">
                <div className="mx-auto grid w-full max-w-[400px] gap-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-3xl font-semibold tracking-tight">Recuperar Contraseña</h1>
                        <p className="text-sm text-zinc-400">
                            {submitted ? "Revisa tu bandeja de entrada" : "Te enviaremos un enlace de recuperación"}
                        </p>
                    </div>

                    {!submitted ? (
                        <form onSubmit={handleReset} className="grid gap-4">
                            <div className="grid gap-2">
                                <Input
                                    type="email"
                                    placeholder="Correo electrónico"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-zinc-900 border-zinc-800 focus:border-[#ccff00] h-11"
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-[#ccff00] text-black hover:bg-[#b5952f] font-semibold h-11 mt-2"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    "Enviar Enlace"
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex flex-col items-center justify-center p-6 bg-zinc-900 rounded-lg border border-zinc-800">
                                <div className="h-12 w-12 bg-[#ccff00]/10 rounded-full flex items-center justify-center mb-4">
                                    <MailCheck className="h-6 w-6 text-[#ccff00]" />
                                </div>
                                <p className="text-center text-sm text-zinc-300">
                                    Hemos enviado un enlace a <span className="text-white font-medium">{email}</span>.
                                    <br />Revisa tu carpeta de spam si no lo ves.
                                </p>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full border-zinc-700 hover:bg-zinc-800 hover:text-white"
                                onClick={() => {
                                    setSubmitted(false)
                                    setEmail("")
                                }}
                            >
                                Intentar con otro correo
                            </Button>
                        </div>
                    )}

                    <div className="text-center">
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center text-sm font-medium text-zinc-400 hover:text-white transition-colors group"
                        >
                            <ArrowLeft className="mr-1 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
