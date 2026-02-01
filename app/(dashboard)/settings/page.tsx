"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { CalendarDays, CreditCard, User, Briefcase, Building2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
    const { user, profile } = useAuth()
    const { toast } = useToast()
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Personal Identity State
    const [personalData, setPersonalData] = useState({
        full_name: '',
        nickname: '',
        email: '',
        phone: '',
        city: '',
        avatar_url: ''
    })

    // Business Identity State
    const [businessData, setBusinessData] = useState<{ name: string, email: string, id: string } | null>(null)

    // Coach Identity State
    const [coachData, setCoachData] = useState<{ id: string, bio: string, specialty: string, hourly_rate: number } | null>(null)

    const [membershipInfo, setMembershipInfo] = useState<{ tier: string | null; daysRemaining: number | null }>({
        tier: null,
        daysRemaining: null
    })

    // Load Data
    useEffect(() => {
        if (user && profile) {
            setPersonalData(prev => ({ ...prev, email: user.email || '' }))
            fetchPersonalProfile()

            // Check for Business Identity
            if (profile.organization_id) {
                fetchBusinessProfile(profile.organization_id)
            }

            // Check for Coach Identity
            // We check if the user has a 'coach' role OR if they have a record in academy_coaches
            // For this implementation, we'll try to fetch the coach record directly
            fetchCoachProfile()
        }
    }, [user, profile])

    const fetchPersonalProfile = async () => {
        if (!user) return
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

        if (data) {
            setPersonalData(prev => ({
                ...prev,
                full_name: data.full_name || '',
                nickname: data.nickname || '',
                phone: data.phone || '',
                city: data.city || '',
                avatar_url: data.avatar_url || ''
            }))

            let days = 0
            if (data.membership_expires_at) {
                const expires = new Date(data.membership_expires_at)
                const now = new Date()
                const diffTime = expires.getTime() - now.getTime()
                days = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            }

            setMembershipInfo({
                tier: data.membership_tier,
                daysRemaining: days > 0 ? days : 0
            })
        }
    }

    const fetchBusinessProfile = async (orgId: string) => {
        const { data } = await supabase
            .from('entities')
            .select('id, name, business_email')
            .eq('id', orgId)
            .single()

        if (data) {
            setBusinessData({
                id: data.id,
                name: data.name,
                email: data.business_email || ''
            })
        }
    }

    const fetchCoachProfile = async () => {
        if (!user) return
        // Try to find a coach record linked to this user
        const { data } = await supabase
            .from('academy_coaches')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

        if (data) {
            setCoachData({
                id: data.id,
                bio: data.bio || '',
                specialty: data.specialty || '',
                hourly_rate: 0 // Placeholder as column might not exist yet
            })
        } else if (profile?.role === 'coach') {
            // User is a coach but no record? Initialize empty (readonly/create mode?)
            // For now we only show if data exists or role matches to avoid clutter
            setCoachData({
                id: 'new',
                bio: '',
                specialty: '',
                hourly_rate: 0
            })
        }
    }

    const handleSavePersonal = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const { error } = await supabase
            .from('users')
            .update({
                full_name: personalData.full_name,
                nickname: personalData.nickname,
                phone: personalData.phone,
                city: personalData.city
            })
            .eq('id', user!.id)

        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } else {
            toast({ title: "Identidad Personal Actualizada", description: "Tus datos personales se han guardado." })
        }
        setLoading(false)
    }

    const handleSaveCoach = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!coachData) return
        setLoading(true)

        // Upsert coach data
        // Note: For now assuming we are updating an existing record or creating one if 'coach' role
        // Since academy_coaches requires an academy_id, independent coaches might need a different flow
        // or a default Null/Self academy. For now, we update if ID exists.

        if (coachData.id !== 'new') {
            const { error } = await supabase
                .from('academy_coaches')
                .update({
                    bio: coachData.bio,
                    specialty: coachData.specialty
                    // hourly_rate: coachData.hourly_rate // excluded until column confirmation
                })
                .eq('id', coachData.id)

            if (error) {
                toast({ variant: "destructive", title: "Error", description: error.message })
            } else {
                toast({ title: "Perfil Profesional Actualizado", description: "Tu bio de coach se ha guardado." })
            }
        } else {
            toast({ variant: "default", title: "Modo Coach", description: "Contacta a tu academia para enlazar tu perfil profesional." })
        }

        setLoading(false)
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Mi Perfil</h1>
                    <p className="text-muted-foreground">Gestiona tu identidad personal y profesional.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Identity Cards */}
                <div className="lg:col-span-2 space-y-6">

                    {/* CARD 1: PERSONAL IDENTITY (Always Visible) */}
                    <Card className="border-border bg-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-indigo-500" />
                                Identidad Personal
                            </CardTitle>
                            <CardDescription>Tu información básica visible para la comunidad.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-6 mb-6">
                                <div className="h-20 w-20 rounded-full bg-muted border-2 border-border flex items-center justify-center overflow-hidden relative group">
                                    {personalData.avatar_url ? (
                                        <img src={personalData.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-2xl font-bold text-muted-foreground">
                                            {personalData.full_name?.charAt(0) || user?.email?.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Foto de Perfil</h3>
                                    <p className="text-xs text-muted-foreground">JPG o PNG. Máx 1MB.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSavePersonal} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nombre Completo</Label>
                                        <Input
                                            value={personalData.full_name}
                                            onChange={e => setPersonalData({ ...personalData, full_name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nickname (Apodo)</Label>
                                        <Input
                                            value={personalData.nickname}
                                            placeholder="Ej. El Matador"
                                            onChange={e => setPersonalData({ ...personalData, nickname: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Teléfono</Label>
                                        <Input
                                            value={personalData.phone}
                                            onChange={e => setPersonalData({ ...personalData, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Ciudad</Label>
                                        <Input
                                            value={personalData.city}
                                            onChange={e => setPersonalData({ ...personalData, city: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Personal (Login)</Label>
                                    <Input
                                        value={personalData.email}
                                        disabled
                                        className="bg-muted/50 text-muted-foreground"
                                    />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={loading} size="sm">
                                        <Save className="w-4 h-4 mr-2" />
                                        Guardar Personal
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* CARD 2: COACH IDENTITY (Conditional) */}
                    {coachData && (
                        <Card className="border-border bg-card border-l-4 border-l-emerald-500">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Briefcase className="h-5 w-5 text-emerald-500" />
                                            Perfil Profesional (Coach)
                                        </CardTitle>
                                        <CardDescription>Gestiona tu presentación pública como entrenador.</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                        Activo
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSaveCoach} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Biografía / Presentación</Label>
                                        <Textarea
                                            value={coachData.bio}
                                            onChange={e => setCoachData({ ...coachData, bio: e.target.value })}
                                            placeholder="Cuenta un poco sobre tu experiencia y metodología..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Especialidad</Label>
                                            <Input
                                                value={coachData.specialty}
                                                onChange={e => setCoachData({ ...coachData, specialty: e.target.value })}
                                                placeholder="Ej. Técnica, Físico, Niños"
                                            />
                                        </div>
                                        {/* Placeholder for future rate column */}
                                        <div className="space-y-2 opacity-50 cursor-not-allowed">
                                            <Label>Tarifa por Hora ($) (Próximamente)</Label>
                                            <Input
                                                type="number"
                                                value={coachData.hourly_rate}
                                                disabled
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" disabled={loading} size="sm" variant="outline" className="border-emerald-500/50 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50">
                                            <Save className="w-4 h-4 mr-2" />
                                            Guardar Profesional
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    )}

                    {/* CARD 3: BUSINESS IDENTITY (Conditional Owner) */}
                    {businessData && (
                        <Card className="border-border bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Building2 className="h-5 w-5 text-amber-500" />
                                            Mi Negocio
                                        </CardTitle>
                                        <CardDescription>Información de tu entidad comercial registrada.</CardDescription>
                                    </div>
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                        Propietario
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Nombre Comercial</Label>
                                        <div className="font-medium text-lg px-3 py-2 bg-zinc-950 rounded-md border border-zinc-800">
                                            {businessData.name}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Email de Negocio (Público)</Label>
                                        <div className="font-medium px-3 py-2 bg-zinc-950 rounded-md border border-zinc-800 flex justify-between items-center">
                                            <span>{businessData.email || 'No configurado'}</span>
                                            <Badge variant="secondary" className="text-xs">Público</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            * Este correo es visible para tus clientes y distinto a tu personal.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-zinc-950/50 border-t border-zinc-800 p-4">
                                <p className="text-xs text-muted-foreground">
                                    Para editar los detalles de tu negocio, ve al <span className="text-amber-500 cursor-pointer hover:underline" onClick={() => router.push('/register-business')}>Panel de Gestión</span>.
                                </p>
                            </CardFooter>
                        </Card>
                    )}
                </div>

                {/* Right Column: Membership & Stats */}
                <div className="space-y-6">
                    {/* Membership Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <CreditCard className="h-24 w-24" />
                        </div>
                        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-2">Membresía PadelFlow</h3>
                        <div className="text-3xl font-black mb-1">{membershipInfo.tier || 'Gratis'}</div>
                        <p className="text-sm text-gray-400 mb-6">Estado: {membershipInfo.daysRemaining !== null && membershipInfo.daysRemaining > 0 ? 'Activa' : 'Inactiva'}</p>

                        {membershipInfo.daysRemaining !== null && membershipInfo.daysRemaining > 0 && (
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full w-fit backdrop-blur-sm">
                                <CalendarDays className="h-4 w-4 text-[#ccff00]" />
                                <span className="text-sm font-bold text-[#ccff00]">
                                    {membershipInfo.daysRemaining} Días Restantes
                                </span>
                            </div>
                        )}
                        <Button variant="outline" className="mt-6 w-full text-black hover:text-black hover:bg-white border-0 bg-white/90">
                            Gestionar Plan
                        </Button>
                    </div>

                    {/* Badge System */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Mis Insignias</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                {/* Static Badges for Demo */}
                                <div className="flex flex-col items-center text-center gap-2">
                                    <div className="h-14 w-14 rounded-full bg-blue-100/10 border-2 border-blue-500/30 flex items-center justify-center text-2xl" title="Ace Academy Student">
                                        🎓
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium">Estudiante</span>
                                </div>
                                <div className="flex flex-col items-center text-center gap-2 opacity-30 grayscale">
                                    <div className="h-14 w-14 rounded-full bg-yellow-100/10 border-2 border-yellow-500/30 flex items-center justify-center text-2xl" title="Tournament Winner">
                                        🏆
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium">Campeón</span>
                                </div>
                                <div className="flex flex-col items-center text-center gap-2 opacity-30 grayscale">
                                    <div className="h-14 w-14 rounded-full bg-purple-100/10 border-2 border-purple-500/30 flex items-center justify-center text-2xl" title="Early Adopter">
                                        ⚡
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium">Pionero</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
