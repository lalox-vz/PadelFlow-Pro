"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import Link from "next/link"
import { Loader2 } from "lucide-react"

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

            if (error) {
                // Determine if we should show the error or a generic one
                // For security, usually keep it vague, but Supabase might be explicit
                throw error
            }

            setSubmitted(true)
            toast({
                title: "Correo enviado",
                description: "Si el correo existe, recibirás un enlace de recuperación.",
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
        <div className="flex flex-1 items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 h-screen">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-10 shadow-xl ring-1 ring-border">
                <div className="text-center flex flex-col items-center">
                    <OlimpoLogo className="h-20 w-auto mb-4 text-foreground" />
                    <h2 className="mt-2 text-3xl font-extrabold text-foreground">Recuperar Contraseña</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </p>
                </div>

                {!submitted ? (
                    <form className="mt-8 space-y-6" onSubmit={handleReset}>
                        <div>
                            <Input
                                type="email"
                                placeholder="Correo electrónico"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-background border-border text-foreground"
                            />
                        </div>

                        <div>
                            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar enlace de recuperación
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="mt-8 text-center space-y-4">
                        <div className="p-4 bg-green-500/10 text-green-500 rounded-md border border-green-500/20">
                            <p className="font-medium">¡Correo enviado!</p>
                            <p className="text-sm mt-1">Revisa tu bandeja de entrada (y spam) para continuar.</p>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                                setSubmitted(false)
                                setEmail("")
                            }}
                        >
                            Intentar con otro correo
                        </Button>
                    </div>
                )}

                <div className="text-center text-sm mt-4">
                    <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    )
}
