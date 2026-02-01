"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Building2, Clock, DollarSign, Sliders, LayoutDashboard } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScheduleManager } from "@/components/club/ScheduleManager"
import { PricingRulesManager } from "@/components/club/PricingRulesManager"
import { IdentitySection } from "@/components/club/IdentitySection"
import { RulesSection } from "@/components/club/RulesSection"

import { useRouter } from "next/navigation"

export default function ClubSettingsPage() {
    const { user, profile } = useAuth()
    const { toast } = useToast()
    const router = useRouter()

    // RBAC Security Check
    useEffect(() => {
        if (profile && profile.role === 'club_staff') {
            toast({
                variant: "destructive",
                title: "Acceso Restringido",
                description: "Solo los administradores pueden acceder a esta sección."
            })
            router.push('/club/calendar')
        }
    }, [profile, router, toast])
    const [clubData, setClubData] = useState({
        id: '',
        name: '',
        email: '',
        phone: '',
        address: '',
        description: '',
        logo_url: '',
        banner_url: '',
        default_duration: 90,
        cancellation_window: 24,
        advance_booking_days: 14
    })

    useEffect(() => {
        if (profile?.organization_id) {
            fetchClubData(profile.organization_id)
        }
    }, [profile])

    const fetchClubData = async (orgId: string) => {
        const { data, error } = await supabase
            .from('entities')
            .select('*')
            .eq('id', orgId)
            .single()

        if (data) {
            setClubData({
                id: data.id,
                name: data.name,
                email: data.business_email || '',
                phone: data.phone || '',
                address: data.address || '',
                description: data.description || '',
                logo_url: data.logo_url || '',
                banner_url: data.banner_url || '',
                default_duration: data.default_duration || 90,
                cancellation_window: data.cancellation_window || 24,
                advance_booking_days: data.advance_booking_days || 14
            })
        }
    }

    if (!profile?.organization_id) {
        return <div className="p-8 text-center text-zinc-500 flex flex-col items-center gap-2">
            <div className="animate-spin text-[#ccff00] h-6 w-6 border-2 border-current border-t-transparent rounded-full" />
            <p>Cargando configuración...</p>
        </div>
    }

    return (
        <div className="space-y-8 container mx-auto max-w-[1200px] pb-20">
            <div className="flex flex-col gap-2 pt-4">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <LayoutDashboard className="w-8 h-8 text-[#ccff00]" />
                    Ajustes del Club
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl">
                    Gestiona la identidad pública, optimiza tu operativa y define tu estrategia de precios.
                </p>
            </div>

            <Tabs defaultValue="general" className="w-full space-y-8">
                <TabsList className="bg-zinc-950/50 border border-zinc-900 p-1.5 h-auto grid w-full grid-cols-2 lg:grid-cols-4 lg:w-[800px] rounded-xl">
                    <TabsTrigger value="general" className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white py-3 rounded-lg flex gap-2">
                        <Building2 className="w-4 h-4" />
                        Identidad
                    </TabsTrigger>
                    <TabsTrigger value="rules" className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white py-3 rounded-lg flex gap-2">
                        <Sliders className="w-4 h-4" />
                        Operación
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white py-3 rounded-lg flex gap-2">
                        <Clock className="w-4 h-4" />
                        Horarios
                    </TabsTrigger>
                    <TabsTrigger value="pricing" className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white py-3 rounded-lg flex gap-2">
                        <DollarSign className="w-4 h-4" />
                        Precios
                    </TabsTrigger>
                </TabsList>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <TabsContent value="general" className="mt-0">
                        <IdentitySection initialData={clubData} onUpdate={() => fetchClubData(profile.organization_id || '')} />
                    </TabsContent>

                    <TabsContent value="rules" className="mt-0">
                        <RulesSection initialData={clubData} onUpdate={() => fetchClubData(profile.organization_id || '')} />
                    </TabsContent>

                    <TabsContent value="schedule" className="mt-0">
                        {/* Card wrapper reused here or move inside ScheduleManager? 
                             Keeping Card here for consistency across tabs unless component has it.
                             ScheduleManager had specific internal layout. Let's check. 
                             ScheduleManager rendered content directly. 
                             Ideally it should be self contained.
                             I'll wrap it in a Card here to match design.
                         */}
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            {/* Passing full card context? ScheduleManager uses it internally?
                                No, ScheduleManager returned div with button header.
                                It didn't have Card wrapper. 
                                Page.tsx previously wrapped it.
                             */}
                            <div className="p-6">
                                <h2 className="text-xl font-bold mb-1">Horarios de Apertura</h2>
                                <p className="text-zinc-400 mb-6">Visualiza y ajusta la disponibilidad de tus pistas.</p>
                                <ScheduleManager entityId={profile.organization_id} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="pricing" className="mt-0">
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h2 className="text-xl font-bold mb-1">Estrategia de Precios</h2>
                            <p className="text-zinc-400 mb-6">Configura tarifas dinámicas para maximizar ingresos.</p>
                            <PricingRulesManager entityId={profile.organization_id} />
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
