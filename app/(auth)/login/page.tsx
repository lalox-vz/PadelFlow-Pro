"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { Eye, EyeOff } from "lucide-react"

import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import { useToast } from "@/hooks/use-toast"
import { getDashboardRoute } from "@/lib/role-navigation"

export default function LoginPage() {
    const { t } = useLanguage()
    const { toast } = useToast()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)

        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        })

        if (error) {
            console.error("Login Error:", error)
            let msg = t.auth.errors.unknown

            // Map Supabase error messages
            const errLower = error.message.toLowerCase()
            if (errLower.includes('invalid login') || errLower.includes('invalid email')) {
                msg = t.auth.errors.invalid_login
            } else if (errLower.includes('email not found')) {
                // Supabase usually returns "Invalid login credentials" for security, but just in case
                msg = t.auth.errors.email_not_found
            }

            setErrorMsg(msg)
            toast({
                title: "Error",
                description: msg,
                variant: "destructive",
            })
            setLoading(false)
        } else {
            // Enhanced Redirect Logic based on Role
            const { data: { user } } = await supabase.auth.getUser()
            const role = user?.user_metadata?.role
            const target = getDashboardRoute(role)

            router.push(target)
            router.refresh()
        }
    }

    return (
        <div className="flex flex-1 items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-10 shadow-xl ring-1 ring-border">
                <div className="text-center flex flex-col items-center">
                    <OlimpoLogo className="h-20 w-auto mb-4 text-foreground" />
                    <h2 className="mt-2 text-3xl font-extrabold text-foreground">{t.auth.signin_title}</h2>
                </div>

                {errorMsg && (
                    <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                        {errorMsg}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <Input
                            type="email"
                            placeholder="Email address"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-background border-border text-foreground"
                        />
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground">
                                    {t.auth.remember_me}
                                </label>
                            </div>
                            <div className="text-sm">
                                <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/80">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "..." : t.auth.signin_btn}
                        </Button>
                    </div>
                </form>
                <div className="text-center text-sm">
                    <p className="text-muted-foreground">
                        {t.auth.no_account}{" "}
                        <Link href="/signup" className="font-medium text-primary hover:text-primary/80">
                            {t.auth.signup_btn}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
