"use client"

import { Sidebar } from "@/components/dashboard/Sidebar"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { OlimpoLogo } from "@/components/icons/OlimpoLogo"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, profile, loading, userRole, signOut } = useAuth()
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { toast } = useToast()
    const { t } = useLanguage()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Only show toast if we are NOT on a public page and we expected a user?
                // Actually, if we are in (dashboard) layout, we MUST have a user.
                // Middleware should handle this, but if we are here without a user, it's a sync issue or expired session.

                // console.log("DashboardLayout: No user found, redirecting to login")
                toast({
                    title: t.auth.errors.session_expired,
                    variant: 'destructive',
                })
                router.push("/login")
            } else {
                // PadelFlow Onboarding Check
                // Only force business registration if the user is a business role (owner, academy_owner, club_owner)
                // AND they haven't completed onboarding.
                // PLAYERS/CLIENTS should NEVER be forced here.

                const role = (userRole || user.user_metadata?.role || 'client').toLowerCase()
                const isBusinessRole = ['owner', 'club_owner', 'academy_owner'].includes(role) // Removed 'admin' to be safe

                if (
                    isBusinessRole &&
                    profile &&
                    (profile.has_business === false || profile.has_business === null) &&
                    user.app_metadata?.role !== 'super_admin' &&
                    (typeof window === 'undefined' || sessionStorage.getItem('skip_onboarding') !== 'true')
                ) {
                    router.push("/register-business")
                }
            }
        }
    }, [user, profile, loading, router, t, toast, userRole])

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 text-white">
                <div className="relative">
                    <div className="absolute -inset-4 bg-[#ccff00]/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="relative animate-bounce">
                        <OlimpoLogo className="h-24 w-24 text-[#ccff00]" />
                    </div>
                </div>
                <div className="mt-8 flex flex-col items-center gap-2">
                    <span className="text-xl font-bold tracking-tight">PadelFlow</span>
                    <span className="text-sm text-zinc-500 animate-pulse">Preparando el terreno...</span>
                </div>
            </div>
        )
    }
    if (!user) return null

    return (
        <div className="flex h-screen bg-background">
            <Sidebar
                userRole={
                    (userRole || profile?.role || (user.app_metadata?.role === 'super_admin' ? 'super_admin' : (user.user_metadata?.role || 'client'))) as any
                }
                userName={user.user_metadata?.full_name || user.email}
                membershipTier={profile?.membership_tier}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
