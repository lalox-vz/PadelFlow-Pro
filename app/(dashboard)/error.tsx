'use client'

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Dashboard Layout Error:", error)
    }, [error])

    const isSuperAdmin = typeof window !== 'undefined' && localStorage.getItem('padelflow_user_role') === 'super_admin'

    return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-50 p-4">
            <div className="text-center space-y-4 max-w-md">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Error en el Dashboard</h2>
                <p className="text-sm text-gray-500">
                    No pudimos cargar esta sección. Puede deberse a un problema de permisos o de red.
                </p>
                <div className="flex gap-4 justify-center pt-2">
                    <Button
                        onClick={() => window.location.href = '/club/calendar'}
                        variant="default"
                    >
                        Volver al Calendario
                    </Button>
                </div>

                {process.env.NODE_ENV === 'development' && isSuperAdmin && (
                    <div className="mt-4 p-4 bg-gray-100 rounded text-left overflow-auto max-h-40 text-xs font-mono text-red-800">
                        {error.message}
                    </div>
                )}
            </div>
        </div>
    )
}
