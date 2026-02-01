"use client"

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export function WhatsAppSticky() {
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    // Allowed paths where the button should appear
    const allowedPaths = ['/', '/contact', '/gallery', '/trainings']

    // Check if current path is allowed (exact match)
    const shouldShow = allowedPaths.includes(pathname)

    if (!shouldShow) return null

    return (
        <a
            href="https://wa.me/584142605230"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20bd5a] hover:scale-110 transition-all duration-300 flex items-center justify-center group"
            aria-label="Contact on WhatsApp"
        >
            <WhatsAppIcon className="w-8 h-8" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 ease-in-out whitespace-nowrap font-medium">
                Chat with us
            </span>
        </a>
    )
}
