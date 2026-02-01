"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useLanguage } from "@/context/LanguageContext"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import { signupAction } from "./actions" // New import

export default function SignupPage() {
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [fullName, setFullName] = useState("")
    const [isBusinessSignup, setIsBusinessSignup] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const router = useRouter()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)

        const formData = new FormData()
        formData.append("email", email)
        formData.append("password", password)
        formData.append("fullName", fullName)
        formData.append("isBusinessSignup", String(isBusinessSignup))

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
            setErrorMsg(msg)
            setLoading(false)
        } else {
            toast({
                title: language === 'es' ? "¡Cuenta creada!" : "Account Created!",
                description: language === 'es'
                    ? "¡Cuenta creada con éxito! Por favor inicia sesión."
                    : "Account created successfully! Please sign in.",
                className: "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            })

            // Redirect Logic - Force full page load to ensure cookies are effective immediately
            // This prevents "Session Expired" errors on the first load of the dashboard
            if (result.isBusinessSignup) {
                window.location.assign("/register-business")
            } else {
                window.location.assign("/player/explore")
            }
            // setLoading(false) // Not needed as page will reload
        }
    }

    return (
        <div className="flex flex-1 items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-card p-10 shadow-xl ring-1 ring-border">
                <div className="text-center flex flex-col items-center">
                    <OlimpoLogo className="h-20 w-auto mb-4 text-foreground" />
                    <h2 className="mt-2 text-3xl font-extrabold text-foreground">{t.auth.signup_title}</h2>
                </div>

                {errorMsg && (
                    <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                        {errorMsg}
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleSignup}>
                    <div className="space-y-4 rounded-md shadow-sm">
                        <Input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="bg-background border-border text-foreground"
                        />
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
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isBusinessSignup"
                            className="h-4 w-4 rounded border-gray-300 text-[#ccff00] focus:ring-[#ccff00]"
                            checked={isBusinessSignup}
                            onChange={(e) => setIsBusinessSignup(e.target.checked)}
                        />
                        <label htmlFor="isBusinessSignup" className="text-sm text-muted-foreground select-none cursor-pointer">
                            {language === 'es' ? "Registrar mi negocio (Club o Academia)" : "Register my business (Club or Academy)"}
                        </label>
                    </div>

                    <div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "..." : t.auth.signup_btn}
                        </Button>
                    </div>
                </form>
                <div className="text-center text-sm">
                    <p className="text-muted-foreground">
                        {t.auth.have_account}{" "}
                        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                            {t.auth.signin_btn}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
