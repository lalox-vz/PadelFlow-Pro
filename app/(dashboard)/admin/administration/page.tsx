"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import FinancialOverview from "@/components/dashboard/FinancialOverview"
import AdminPaymentLedger from "@/components/dashboard/AdminPaymentLedger"
import { cn } from "@/lib/utils"

export default function AdministrationPage() {
    const searchParams = useSearchParams()
    const initialTab = searchParams.get('tab') === 'payments' ? 'payments' : 'finances'
    const [activeTab, setActiveTab] = useState<'finances' | 'payments'>(initialTab)

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab === 'payments' || tab === 'finances') {
            setActiveTab(tab)
        }
    }, [searchParams])

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">Administración</h1>

            {/* Tabs Navigation */}
            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('finances')}
                        className={cn(
                            activeTab === 'finances'
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                            "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                        )}
                    >
                        Finanzas y Balance
                    </button>
                    <button
                        onClick={() => setActiveTab('payments')}
                        className={cn(
                            activeTab === 'payments'
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                            "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
                        )}
                    >
                        Gestión de Pagos
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'finances' ? (
                    <FinancialOverview />
                ) : (
                    <AdminPaymentLedger />
                )}
            </div>
        </div>
    )
}
