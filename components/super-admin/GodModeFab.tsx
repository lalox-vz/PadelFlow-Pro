"use client"

import { useState, useEffect } from "react"
import { Zap, Shield, User, Eye, X, ChevronUp, RefreshCw } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
// import { UserRole } from "@/types" // unused
import { usePathname } from "next/navigation"

export function GodModeFab() {
    const { user, profile } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [impersonatedRole, setImpersonatedRole] = useState<string | null>(null)
    const [isSuperAdmin, setIsSuperAdmin] = useState(false)
    const pathname = usePathname() // Import this!

    // Check if real user is super admin
    useEffect(() => {
        if (user?.app_metadata?.role === 'super_admin') {
            setIsSuperAdmin(true)
        }

        // ... rest of effect

        // Check for active impersonation
        const cookies = document.cookie.split(';')
        const roleCookie = cookies.find(c => c.trim().startsWith('impersonated_role='))
        if (roleCookie) {
            setImpersonatedRole(roleCookie.split('=')[1])
        }
    }, [user])

    if (!isSuperAdmin) return null

    const handleImpersonate = (role: string | null) => {
        if (role) {
            // Set cookie for 1 hour
            document.cookie = `impersonated_role=${role}; path=/; max-age=3600; SameSite=Lax`
        } else {
            // Clear cookie
            document.cookie = "impersonated_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        }
        // Reload to apply changes
        window.location.reload()
    }

    const roles = [
        { label: "Super Admin", role: null, icon: Zap, color: "text-yellow-500" },
        { label: "Academy Owner", role: "academy_owner", icon: Shield, color: "text-blue-500" },
        { label: "Player/Client", role: "client", icon: User, color: "text-green-500" },
        { label: "Visitor", role: "visitor", icon: Eye, color: "text-gray-400" },
    ]

    const whatsappPaths = ['/', '/contact', '/gallery', '/trainings']
    const hasWhatsapp = whatsappPaths.includes(pathname)

    return (
        <div className={cn(
            "fixed right-6 z-50 flex flex-col items-end space-y-2 transition-all duration-300",
            hasWhatsapp ? "bottom-24" : "bottom-6"
        )}>

            {/* Expanded Menu */}
            {isOpen && (
                <div className="bg-popover border border-border rounded-lg shadow-xl p-2 mb-2 w-64 animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-border/50">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">God Mode</span>
                        {impersonatedRole && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-red-400 hover:text-red-300 px-1"
                                onClick={() => handleImpersonate(null)}
                            >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Reset
                            </Button>
                        )}
                    </div>
                    <div className="space-y-1">
                        {roles.map((r) => {
                            const isActive = impersonatedRole === r.role || (r.role === null && !impersonatedRole)
                            return (
                                <button
                                    key={r.label}
                                    onClick={() => {
                                        if (r.role !== impersonatedRole && !(r.role === null && !impersonatedRole)) {
                                            handleImpersonate(r.role)
                                        }
                                    }}
                                    className={cn(
                                        "w-full flex items-center p-2 rounded-md text-sm transition-colors hover:bg-muted font-medium",
                                        isActive ? "bg-muted/50 text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    <r.icon className={cn("w-4 h-4 mr-3", r.color)} />
                                    {r.label}
                                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* FAB Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 border-2",
                    impersonatedRole
                        ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-400 animate-pulse"
                        : "bg-zinc-900 hover:bg-zinc-800 border-[#D4AF37]", // Olimpo Gold
                    isOpen ? "rotate-90" : "rotate-0"
                )}
            >
                {impersonatedRole ? (
                    <Eye className="w-6 h-6 text-white" />
                ) : (
                    <Zap className="w-6 h-6 text-[#D4AF37]" fill="currentColor" />
                )}
            </Button>
        </div>
    )
}
