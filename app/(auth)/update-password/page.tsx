"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import { Loader2, Eye, EyeOff } from "lucide-react"

export default function UpdatePasswordPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    // Ensure session is active (hash exchange usually happens automatically by Supabase client)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // If no session, it might mean the link is invalid or expired.
                // However, Supabase sometimes takes a moment to exchange the code for session.
                // Or maybe they came here directly without clicking the email link.

                // We'll let them stay for a moment, but if submitting fails we know why.
            }
        }
        checkSession()
    }, [])

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            toast({
                title: "Error",
                description: "Las contraseñas no coinciden.",
                variant: "destructive",
            })
            return
        }

        if (password.length < 6) {
            toast({
                title: "Error",
                description: "La contraseña deb tener al menos 6 caracteres.",
                variant: "destructive",
            })
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            toast({
                title: "Contraseña actualizada",
                description: "Tu contraseña ha sido restablecida exitosamente.",
            })

            // Redirect to dashboard or login
            router.push("/")

        } catch (error: any) {
            console.error(error)
            toast({
                title: "Error",
                description: error.message || "No se pudo actualizar la contraseña. El enlace puede haber expirado.",
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
                    <h2 className="mt-2 text-3xl font-extrabold text-foreground">Nueva Contraseña</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Ingresa y confirma tu nueva contraseña.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleUpdate}>
                    <div className="space-y-4">
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Nueva Contraseña"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pr-10 bg-background border-border text-foreground"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground focus:outline-none"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                                ) : (
                                    <Eye className="h-5 w-5" aria-hidden="true" />
                                )}
                            </button>
                        </div>

                        <Input
                            type="password"
                            placeholder="Confirmar Contraseña"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-background border-border text-foreground"
                        />
                    </div>

                    <div>
                        <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Actualizar Contraseña
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
