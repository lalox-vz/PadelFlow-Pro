"use client"

import { useLanguage } from "@/context/LanguageContext"
import { useAuth } from "@/context/AuthContext"
import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function PricingPage() {
    const { t } = useLanguage()
    const { user } = useAuth()
    const router = useRouter()

    // User requested: 
    // Guest -> Redirect to Create Account, then they come back here.
    // Logged In -> Redirect to new Checkout page.
    const [profile, setProfile] = useState<any>(null)
    const [daysRemaining, setDaysRemaining] = useState<number>(0)
    const [loadingP, setLoadingP] = useState(true)

    // Expiration Fetching
    useEffect(() => {
        const fetchStatus = async () => {
            if (!user) {
                setLoadingP(false)
                return
            }

            // Import supabase client
            const { supabase } = await import("@/lib/supabase")

            const { data } = await supabase.from('users').select('membership_tier, membership_expires_at').eq('id', user.id).single()

            if (data) {
                setProfile(data)
                if (data.membership_expires_at) {
                    const expires = new Date(data.membership_expires_at)
                    const now = new Date()
                    const diffTime = expires.getTime() - now.getTime()
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                    setDaysRemaining(diffDays > 0 ? diffDays : 0)
                }
            }
            setLoadingP(false)
        }
        fetchStatus()
    }, [user])

    const isActive = daysRemaining > 0
    const currentTier = profile?.membership_tier

    const handlePlanClick = (plan: string) => {
        if (!user) {
            router.push("/signup")
        } else {
            // Check if it's an upgrade
            const isUpgrade = isActive && plan !== currentTier?.toLowerCase()
            // Simplified logic: If active and clicking a different plan (higher), treat as upgrade.
            // If clicking same plan, maybe do nothing?

            if (isActive && plan.toLowerCase() === currentTier?.toLowerCase()) return

            router.push(`/client/checkout?plan=${plan}${isUpgrade ? '&upgrade=true' : ''}`)
        }
    }

    return (
        <div className="bg-background py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl sm:text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t.pricing.title}</h1>
                    <p className="mt-6 text-lg leading-8 text-muted-foreground">
                        {t.pricing.subtitle}
                    </p>
                    {isActive && (
                        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
                            <p className="text-blue-800 font-medium dark:text-blue-200">
                                Tienes una membresía activa ({currentTier}). Te quedan {daysRemaining} días.
                            </p>
                        </div>
                    )}
                </div>
                <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-border sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">

                    {/* VIP Plan */}
                    <div className="p-8 sm:p-10 lg:flex-auto">
                        <h3 className="text-2xl font-bold tracking-tight text-foreground">{t.pricing.plans.vip.name}</h3>
                        <p className="mt-2 text-base leading-7 text-indigo-600 dark:text-indigo-400 font-semibold">{t.pricing.plans.vip.promo}</p>
                        <div className="mt-10 flex items-center gap-x-4">
                            <h4 className="flex-none text-sm font-semibold leading-6 text-indigo-600 dark:text-indigo-400">{t.pricing.whats_included}</h4>
                            <div className="h-px flex-auto bg-border" />
                        </div>
                        <ul role="list" className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-muted-foreground sm:grid-cols-2 sm:gap-6">
                            {t.pricing.plans.vip.features.map((feature) => (
                                <li key={feature} className="flex gap-x-3">
                                    <Check className="h-6 w-5 flex-none text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                        <div className="rounded-2xl bg-muted/50 py-10 text-center ring-1 ring-inset ring-border lg:flex lg:flex-col lg:justify-center lg:py-16">
                            <div className="mx-auto max-w-xs px-8">
                                <p className="text-base font-semibold text-muted-foreground">{t.pricing.monthly}</p>
                                <p className="mt-6 flex items-baseline justify-center gap-x-2">
                                    <span className="text-5xl font-bold tracking-tight text-foreground">{t.pricing.plans.vip.price}</span>
                                    <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">USD</span>
                                </p>
                                <Button
                                    className="mt-10 w-full"
                                    onClick={() => handlePlanClick('vip')}
                                    disabled={isActive && (currentTier === 'VIP' || currentTier === 'PROFESSIONAL' || currentTier === 'Professional')}
                                >
                                    {isActive ? (currentTier === 'VIP' || currentTier === 'PROFESSIONAL' || currentTier === 'Professional' ? 'Plan Actual' : 'Mejorar Plan') : t.pricing.choose_plan}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Other Plans Grid */}
                <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 text-center lg:max-w-none lg:grid-cols-2">
                    {/* ACCESS Plan */}
                    <div className="flex flex-col justify-between rounded-3xl bg-card p-8 ring-1 ring-border xl:p-10 hover:shadow-lg transition-shadow">
                        <div>
                            <h3 className="text-lg font-semibold leading-8 text-foreground">{t.pricing.plans.access.name}</h3>
                            <p className="mt-4 text-sm leading-6 text-indigo-600 dark:text-indigo-400 font-bold">{t.pricing.plans.access.promo}</p>
                            <p className="mt-6 flex items-baseline justify-center gap-x-1">
                                <span className="text-4xl font-bold tracking-tight text-foreground">{t.pricing.plans.access.price}</span>
                                <span className="text-sm font-semibold leading-6 text-muted-foreground">/mo</span>
                            </p>
                            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground text-left">
                                {t.pricing.plans.access.features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3">
                                        <Check className="h-6 w-5 flex-none text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Button
                            className="mt-8 mx-auto block w-full"
                            variant="outline"
                            onClick={() => handlePlanClick('access')}
                            disabled={isActive && (currentTier === 'VIP' || currentTier === 'PROFESSIONAL' || currentTier === 'Professional' || currentTier === 'ACCESS' || currentTier === 'Access' || currentTier === 'AMATEUR' || currentTier === 'Amateur')}
                        >
                            {isActive ? (
                                (currentTier === 'ACCESS' || currentTier === 'Access' || currentTier === 'AMATEUR' || currentTier === 'Amateur') ? 'Plan Actual' :
                                    (currentTier === 'VIP' || currentTier === 'PROFESSIONAL' || currentTier === 'Professional') ? 'Plan Inferior' : 'Mejorar Plan'
                            ) : t.pricing.choose_plan}
                        </Button>
                    </div>

                    {/* BASIC Plan */}
                    <div className="flex flex-col justify-between rounded-3xl bg-card p-8 ring-1 ring-border xl:p-10 hover:shadow-lg transition-shadow">
                        <div>
                            <h3 className="text-lg font-semibold leading-8 text-foreground">{t.pricing.plans.basic.name}</h3>
                            <p className="mt-4 text-sm leading-6 text-indigo-600 dark:text-indigo-400 font-bold">{t.pricing.plans.basic.promo}</p>
                            <p className="mt-6 flex items-baseline justify-center gap-x-1">
                                <span className="text-4xl font-bold tracking-tight text-foreground">{t.pricing.plans.basic.price}</span>
                                <span className="text-sm font-semibold leading-6 text-muted-foreground">/mo</span>
                            </p>
                            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground text-left">
                                {t.pricing.plans.basic.features.map((feature) => (
                                    <li key={feature} className="flex gap-x-3">
                                        <Check className="h-6 w-5 flex-none text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Button
                            className="mt-8 mx-auto block w-full"
                            variant="outline"
                            onClick={() => handlePlanClick('basic')}
                            disabled={isActive}
                        >
                            {isActive ? ((currentTier === 'BASIC' || currentTier === 'Basic' || currentTier === 'ROOKIE' || currentTier === 'Rookie') ? 'Plan Actual' : 'Plan Inferior') : t.pricing.choose_plan}
                        </Button>
                    </div>
                </div>

                <div className="mt-10 text-center">
                    <p className="text-sm text-muted-foreground italic">
                        {t.pricing.note}
                    </p>
                </div>
            </div>
        </div>
    )
}
