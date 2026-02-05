"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { DollarSign, BarChart3 } from "lucide-react"
import { RevenueView } from "@/components/club/revenue/RevenueView"
import { AnalyticsView } from "@/components/club/analytics/AnalyticsView"

export default function ClubRevenuePage() {
    const { profile } = useAuth()
    const [activeTab, setActiveTab] = useState<'revenue' | 'analytics'>('revenue')

    return (
        <div className="space-y-6">
            {/* Header with Title and Tabs */}
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
                        Finanzas y Reportes
                    </h1>
                    <p className="text-zinc-400 max-w-lg">
                        Visualiza el flujo de caja y el rendimiento operativo en tiempo real tomen decisiones estratégicas.
                    </p>
                </div>

                {/* iOS Style Segmented Control */}
                <div className="bg-zinc-900/80 p-1.5 rounded-full border border-zinc-800 flex items-center relative">
                    {/* Active Pill Background Animation */}
                    <motion.div
                        className="absolute top-1.5 bottom-1.5 bg-zinc-800 rounded-full shadow-lg border border-zinc-600/50 z-0"
                        layoutId="activeTab"
                        initial={false}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30
                        }}
                        style={{
                            left: activeTab === 'revenue' ? '6px' : '50%',
                            width: 'calc(50% - 6px)',
                        }}
                    />

                    <button
                        onClick={() => setActiveTab('revenue')}
                        className={cn(
                            "relative z-10 flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors w-40 justify-center",
                            activeTab === 'revenue' ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                        )}
                    >
                        <DollarSign className="w-4 h-4" />
                        Ingresos
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={cn(
                            "relative z-10 flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-colors w-40 justify-center",
                            activeTab === 'analytics' ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                        )}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Uso Canchas
                    </button>
                </div>
            </div>

            {/* Content Area with Animation */}
            <div className="min-h-[600px] mt-6 relative">
                <AnimatePresence mode="wait">
                    {activeTab === 'revenue' ? (
                        <motion.div
                            key="revenue"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <RevenueView />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="analytics"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <AnalyticsView />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
