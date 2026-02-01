'use client'

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Dashboard Error:", error)
    }, [error])

    const isSuperAdmin = typeof window !== 'undefined' && localStorage.getItem('padelflow_user_role') === 'super_admin'

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-950 p-4">
            <div className="text-center space-y-6 max-w-lg">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
                    <svg className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>

                <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight text-white">
                        El partido se ha pausado
                    </h2>
                    <p className="text-zinc-400 text-lg">
                        Hemos encontrado un obstáculo en la cancha. No te preocupes, el equipo técnico ya está revisando la jugada.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Button
                        onClick={() => window.location.href = '/club/calendar'}
                        className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-bold px-8 h-12 rounded-xl transition-all hover:scale-105"
                    >
                        Volver a la Cancha
                    </Button>
                    <Button
                        onClick={() => reset()}
                        variant="outline"
                        className="border-zinc-800 text-white hover:bg-zinc-900 h-12 rounded-xl"
                    >
                        Reintentar Jugada
                    </Button>
                </div>

                {process.env.NODE_ENV === 'development' && isSuperAdmin && (
                    <div className="mt-8 pt-8 border-t border-zinc-900 w-full text-left">
                        <details className="cursor-pointer group">
                            <summary className="text-xs font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors list-none flex items-center justify-center gap-2">
                                <span>Ver detalles técnicos (Solo Super Admin)</span>
                                <svg className="w-3 h-3 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div className="mt-4 p-4 bg-black/50 rounded-lg border border-red-900/20 overflow-auto max-h-60 text-xs font-mono text-red-400">
                                {error.message}
                                {error.stack && <pre className="mt-2 opacity-50">{error.stack}</pre>}
                            </div>
                        </details>
                    </div>
                )}
            </div>
        </div>
    )
}
