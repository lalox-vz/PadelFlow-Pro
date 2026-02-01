"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function DashboardPage() {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && user) {
            const role = user.user_metadata?.role || 'client' // Ensure role is in metadata or fetched elsewhere
            if (user.user_metadata?.role === 'admin') {
                router.push("/admin")
            } else {
                router.push("/client")
            }
        }
    }, [user, loading, router])

    return <div className="p-10">Redirecting...</div>
}
