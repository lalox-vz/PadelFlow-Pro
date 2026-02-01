"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OnboardingStepper } from "../components/OnboardingStepper"
import { Loader2, Save, ArrowRight, ArrowLeft, Upload, CheckCircle2, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Business } from "@/types/business"
import confetti from "canvas-confetti"

const STEPS = [
    { id: 1, label: "Identidad" },
    { id: 2, label: "Infraestructura" },
    { id: 3, label: "Operación" },
    { id: 4, label: "Reservas y Pagos" }
]

export default function ClubOnboardingPage() {
    const { user, profile } = useAuth()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [step, setStep] = useState(1)

    // Form State
    const [formData, setFormData] = useState<Partial<Business>>({
        name: "",
        fiscal_id: "",
        phone: "",
        email: "",
        city: "",
        state: "",
        court_count: 1,
        surface_type: "artificial_grass",
        is_covered: false,
        lighting_cost: 0,
        hourly_rate: 0,
        operating_hours: { start: "07:00", end: "23:00" },
        booking_rules: { min_time_minutes: 60, max_time_minutes: 180, cancellation_hours: 24 },
        payment_methods: [
            { type: 'cash', enabled: true, require_proof: false },
            { type: 'zelle', enabled: false },
            { type: 'pago_movil', enabled: false }
        ]
    })

    // Load existing data
    useEffect(() => {
        const loadData = async () => {
            if (!user) return

            try {
                // Check if club entity exists
                const { data: entity } = await supabase
                    .from('entities')
                    .select('*')
                    .eq('owner_id', user.id)
                    .eq('type', 'CLUB')
                    .single()

                if (entity) {
                    const details = entity.details || {}
                    setFormData(prev => ({
                        ...prev,
                        name: entity.name,
                        ...details,
                        // Ensure nested objects are merged
                        operating_hours: details.operating_hours || prev.operating_hours,
                        booking_rules: details.booking_rules || prev.booking_rules,
                        payment_methods: details.payment_methods || prev.payment_methods
                    }))
                }

                // Check saved step
                if (profile?.onboarding_step && profile.onboarding_step > 1) {
                    setStep(profile.onboarding_step > 4 ? 4 : profile.onboarding_step)
                }

            } catch (err) {
                console.error("Error loading onboarding data", err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [user, profile])

    const updateField = (field: keyof Business, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const updateNestedField = (parent: keyof Business, key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [parent]: {
                ...(prev[parent] as any),
                [key]: value
            }
        }))
    }

    const handleNext = async () => {
        if (!user) return
        setSaving(true)

        try {
            // Validate Name
            if (step === 1 && !formData.name) {
                toast({ title: "Error", description: "El nombre del club es obligatorio", variant: "destructive" })
                setSaving(false)
                return
            }

            // Prepare Data for Entities Table
            // Extract 'name' and put everything else in 'details'
            // We need to fetch the existing ID if we are updating, or upsert based on logic.
            // Since we don't have a unique constraint on owner_id for entities (1:N), we need to find it first or use the ID if we loaded it.

            // For simplicity in this onboarding flow (User only has 1 main club being created):
            // We check if an entity already exists for this user to update it, or create new.

            let entityId = null
            const { data: existingEntity } = await supabase
                .from('entities')
                .select('id')
                .eq('owner_id', user.id)
                .eq('type', 'CLUB')
                .single()

            if (existingEntity) entityId = existingEntity.id

            const { name, ...detailsData } = formData

            const payload = {
                owner_id: user.id,
                type: 'CLUB',
                name: name,
                business_email: formData.email,
                details: detailsData,
                updated_at: new Date().toISOString()
            }

            let error = null

            if (entityId) {
                const { error: updateError } = await supabase
                    .from('entities')
                    .update(payload)
                    .eq('id', entityId)
                error = updateError
            } else {
                const { data: newEntity, error: insertError } = await supabase
                    .from('entities')
                    .insert(payload)
                    .select()
                    .single()

                if (newEntity) entityId = newEntity.id
                error = insertError
            }

            if (error) throw error

            // 2. Update User Step using secure RPC
            const nextStep = step + 1
            if (nextStep <= 4) {
                await supabase.rpc('update_user_onboarding', {
                    p_business_type: 'club',
                    p_status: 'in_progress',
                    p_step: nextStep
                })
                setStep(nextStep)
            } else {
                // Final Step Completion
                await supabase.rpc('update_user_onboarding', {
                    p_business_type: 'club',
                    p_status: 'completed',
                    p_step: 4
                })

                // --- ARCHITECTURE INTEGRITY: Populate SQL Tables ---
                try {
                    // 1. Create Courts (If none exist)
                    const { count: courtsCount } = await supabase.from('courts').select('*', { count: 'exact', head: true }).eq('club_id', entityId)
                    if (courtsCount === 0 && (formData.court_count || 0) > 0) {
                        const courtsToInsert = Array.from({ length: formData.court_count || 1 }).map((_, i) => ({
                            club_id: entityId,
                            name: `Cancha ${i + 1}`,
                            is_active: true,
                            details: {
                                surface: formData.surface_type,
                                is_covered: formData.is_covered,
                                base_price: formData.hourly_rate
                            }
                        }))
                        await supabase.from('courts').insert(courtsToInsert)
                    }

                    // 2. Create Opening Hours
                    const { count: hoursCount } = await supabase.from('opening_hours').select('*', { count: 'exact', head: true }).eq('entity_id', entityId)
                    if (hoursCount === 0) {
                        const start = formData.operating_hours?.start || '07:00'
                        const end = formData.operating_hours?.end || '23:00'
                        const days = [0, 1, 2, 3, 4, 5, 6] // All week

                        const hoursPayload = days.map(d => ({
                            entity_id: entityId,
                            day_of_week: d,
                            open_time: start,
                            close_time: end
                        }))
                        await supabase.from('opening_hours').insert(hoursPayload)
                    }

                    // 3. Create Default Pricing Rule
                    const { count: rulesCount } = await supabase.from('pricing_rules').select('*', { count: 'exact', head: true }).eq('entity_id', entityId)
                    if (rulesCount === 0 && formData.hourly_rate) {
                        await supabase.from('pricing_rules').insert({
                            entity_id: entityId,
                            name: 'Tarifa Base',
                            price: formData.hourly_rate,
                            days: [0, 1, 2, 3, 4, 5, 6],
                            start_time: '00:00',
                            end_time: '23:59',
                            is_active: true
                        })
                    }

                    // 4. Update Entity Config Columns
                    await supabase.from('entities').update({
                        default_duration: formData.booking_rules?.min_time_minutes || 90,
                        cancellation_window: formData.booking_rules?.cancellation_hours || 24,
                        advance_booking_days: 14
                    }).eq('id', entityId)

                } catch (migrationError) {
                    console.error("Error migrating onboarding data to SQL tables:", migrationError)
                    // We continue, as this is non-blocking for user role assignment, but should be logged.
                }

                // CRITICAL: Linking User to Entity
                const { error: roleError } = await supabase
                    .from('users')
                    .update({
                        role: 'club_owner',
                        organization_id: entityId, // Link to the new/updated entity
                        has_business: true,
                        business_type: 'club'
                    })
                    .eq('id', user.id)

                if (roleError) {
                    console.error('Error updating role:', roleError)
                }

                // CRITICAL: Update Auth Session Metadata immediately
                const { error: authError } = await supabase.auth.updateUser({
                    data: {
                        role: 'club_owner',
                        organization_id: entityId,
                        business_type: 'club'
                    }
                })
                if (authError) console.error('Error updating auth metadata:', authError)

                // CRITICAL: Update localStorage cache immediately
                if (typeof window !== 'undefined') {
                    localStorage.setItem('padelflow_user_role', 'club_owner')
                    console.log('AUTH: Role updated to club_owner and cached')
                }

                toast({ title: "¡Todo listo!", description: "Tu club ha sido configurado exitosamente.", className: "bg-[#ccff00] text-black border-none" })

                // Force a hard reload to ensure AuthContext re-initializes
                window.location.href = '/club/dashboard'
                // router.refresh()
            }

        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: error.message || "Hubo un error al guardar", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    const handleBack = async () => {
        if (step > 1) {
            const prevStep = step - 1
            setStep(prevStep)
            // Optionally save backward progress? No need usually.
            if (user) {
                await supabase.from('users').update({ onboarding_step: prevStep }).eq('id', user.id)
            }
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-[#ccff00]" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 relative">
            {/* Exit Strategy: Top Right Close */}
            <button
                onClick={() => router.push('/')}
                className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Salir al inicio"
            >
                <Upload className="h-6 w-6 rotate-90" /> {/* Using Upload purely as an exit icon variant or stick to X from Lucide */}
            </button>
            <div className="max-w-4xl mx-auto pt-10">
                <OnboardingStepper
                    currentStep={step}
                    steps={STEPS}
                    onStepClick={(stepId) => setStep(stepId)}
                />

                <div className="mt-8">
                    {/* STEP 1: IDENTITY */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold">Identidad del Club</h2>
                            <p className="text-muted-foreground">Comencemos con los detalles básicos de tu negocio.</p>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Nombre del Club</Label>
                                    <Input
                                        value={formData.name || ''}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        placeholder="Ej: Padel Center Caracas"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>RIF / Identificación Fiscal</Label>
                                    <Input
                                        value={formData.fiscal_id || ''}
                                        onChange={(e) => updateField('fiscal_id', e.target.value)}
                                        placeholder="J-12345678-9"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input
                                        value={formData.phone || ''}
                                        onChange={(e) => updateField('phone', e.target.value)}
                                        placeholder="+58 412 123 4567"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email de Contacto</Label>
                                    <Input
                                        value={formData.email || ''}
                                        onChange={(e) => updateField('email', e.target.value)}
                                        placeholder="contacto@miclub.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ciudad</Label>
                                    <Input
                                        value={formData.city || ''}
                                        onChange={(e) => updateField('city', e.target.value)}
                                        placeholder="Caracas"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Estado / Zona</Label>
                                    <Input
                                        value={formData.state || ''}
                                        onChange={(e) => updateField('state', e.target.value)}
                                        placeholder="Miranda"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: INFRASTRUCTURE */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold">Infraestructura</h2>
                            <p className="text-muted-foreground">Configura tus instalaciones.</p>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Cantidad de Canchas</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.court_count || 1}
                                        onChange={(e) => updateField('court_count', parseInt(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de Superficie</Label>
                                    <Select
                                        value={formData.surface_type || 'artificial_grass'}
                                        onValueChange={(val) => updateField('surface_type', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="artificial_grass">Césped Artificial</SelectItem>
                                            <SelectItem value="cement">Cemento / Hard Court</SelectItem>
                                            <SelectItem value="clay">Arcilla</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Precio Iluminación ($/hora) (Opcional)</Label>
                                    <Input
                                        type="number"
                                        value={formData.lighting_cost || 0}
                                        onChange={(e) => updateField('lighting_cost', parseFloat(e.target.value))}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-8">
                                    <input
                                        type="checkbox"
                                        id="covered"
                                        className="w-4 h-4 rounded border-gray-300 text-[#ccff00] focus:ring-[#ccff00]"
                                        checked={formData.is_covered || false}
                                        onChange={(e) => updateField('is_covered', e.target.checked)}
                                    />
                                    <Label htmlFor="covered">¿Instalaciones Techadas?</Label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: OPERATION */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold">Horarios y Operación</h2>
                            <p className="text-muted-foreground">Define cuándo pueden reservar tus clientes.</p>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Hora de Apertura</Label>
                                    <Input
                                        type="time"
                                        value={formData.operating_hours?.start || '07:00'}
                                        onChange={(e) => updateNestedField('operating_hours', 'start', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Hora de Cierre</Label>
                                    <Input
                                        type="time"
                                        value={formData.operating_hours?.end || '23:00'}
                                        onChange={(e) => updateNestedField('operating_hours', 'end', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: BOOKINGS & PAYMENTS */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold">Reservas y Pagos</h2>
                            <p className="text-muted-foreground">Configura precios y métodos de pago.</p>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Precio por Hora Estándar ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.hourly_rate || 0}
                                        onChange={(e) => updateField('hourly_rate', parseFloat(e.target.value))}
                                        placeholder="40.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tiempo Mínimo de Reserva (min)</Label>
                                    <Input
                                        type="number"
                                        step={30}
                                        value={formData.booking_rules?.min_time_minutes || 60}
                                        onChange={(e) => updateNestedField('booking_rules', 'min_time_minutes', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="border border-muted rounded-lg p-6 space-y-4 bg-muted/20">
                                <h3 className="font-semibold text-lg">Métodos de Pago Aceptados</h3>

                                {formData.payment_methods?.map((method, idx) => (
                                    <div key={method.type} className="flex items-start space-x-4 p-4 rounded-md border bg-card">
                                        <input
                                            type="checkbox"
                                            checked={method.enabled}
                                            onChange={(e) => {
                                                const newMethods = [...(formData.payment_methods || [])]
                                                newMethods[idx].enabled = e.target.checked
                                                updateField('payment_methods', newMethods)
                                            }}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#ccff00] focus:ring-[#ccff00]"
                                        />
                                        <div className="flex-1 space-y-2">
                                            <div className="font-medium capitalize">
                                                {method.type === 'pago_movil' ? 'Pago Móvil' : method.type}
                                            </div>

                                            {method.type === 'cash' && method.enabled && (
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={method.require_proof || false}
                                                        onChange={(e) => {
                                                            const newMethods = [...(formData.payment_methods || [])]
                                                            newMethods[idx].require_proof = e.target.checked
                                                            updateField('payment_methods', newMethods)
                                                        }}
                                                        className="w-4 h-4 rounded border-gray-300 text-[#ccff00] focus:ring-[#ccff00]"
                                                    />
                                                    <Label className="text-sm text-muted-foreground font-normal">
                                                        Requerir foto del billete/pago (Verificación de billetes rotos/falsos)
                                                    </Label>
                                                </div>
                                            )}

                                            {method.type !== 'cash' && method.type !== 'card' && method.enabled && (
                                                <div className="space-y-3 mt-3">
                                                    {method.type === 'zelle' ? (
                                                        <Input
                                                            placeholder="Correo Zelle"
                                                            value={(typeof method.details === 'object' && method.details?.email) ? method.details.email : (typeof method.details === 'string' ? method.details : '')}
                                                            onChange={(e) => {
                                                                const newMethods = [...(formData.payment_methods || [])]
                                                                // Handle both string (legacy) and object formats for safety
                                                                const current = typeof newMethods[idx].details === 'object' ? newMethods[idx].details : { email: '' }
                                                                newMethods[idx].details = { ...current, email: e.target.value }
                                                                updateField('payment_methods', newMethods)
                                                            }}
                                                            className="text-sm"
                                                        />
                                                    ) : method.type === 'pago_movil' ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <Input
                                                                placeholder="Teléfono (Ej: 04141234567)"
                                                                value={typeof method.details === 'object' ? method.details.phone : ''}
                                                                onChange={(e) => {
                                                                    const newMethods = [...(formData.payment_methods || [])]
                                                                    const current = typeof newMethods[idx].details === 'object' ? newMethods[idx].details : {}
                                                                    newMethods[idx].details = { ...current, phone: e.target.value }
                                                                    updateField('payment_methods', newMethods)
                                                                }}
                                                                className="text-sm"
                                                            />
                                                            <Input
                                                                placeholder="Banco (Ej: Banesco)"
                                                                value={typeof method.details === 'object' ? method.details.bank : ''}
                                                                onChange={(e) => {
                                                                    const newMethods = [...(formData.payment_methods || [])]
                                                                    const current = typeof newMethods[idx].details === 'object' ? newMethods[idx].details : {}
                                                                    newMethods[idx].details = { ...current, bank: e.target.value }
                                                                    updateField('payment_methods', newMethods)
                                                                }}
                                                                className="text-sm"
                                                            />
                                                            <Input
                                                                placeholder="C.I. o RIF (Ej: V12345678)"
                                                                value={typeof method.details === 'object' ? method.details.id_doc : ''}
                                                                onChange={(e) => {
                                                                    const newMethods = [...(formData.payment_methods || [])]
                                                                    const current = typeof newMethods[idx].details === 'object' ? newMethods[idx].details : {}
                                                                    newMethods[idx].details = { ...current, id_doc: e.target.value }
                                                                    updateField('payment_methods', newMethods)
                                                                }}
                                                                className="text-sm col-span-1 md:col-span-2"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            placeholder="Detalles"
                                                            value={(typeof method.details === 'string') ? method.details : ''}
                                                            onChange={(e) => {
                                                                const newMethods = [...(formData.payment_methods || [])]
                                                                newMethods[idx].details = e.target.value
                                                                updateField('payment_methods', newMethods)
                                                            }}
                                                            className="text-sm"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-12 pt-6 border-t border-muted">
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={step === 1 || saving}
                            className="w-32"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Atrás
                        </Button>

                        <Button
                            onClick={handleNext}
                            disabled={saving}
                            className="bg-[#ccff00] text-black hover:bg-[#b5952f] w-32"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    {step === 4 ? 'Finalizar' : 'Siguiente'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => router.push('/')}
                            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                        >
                            Saltar por ahora
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
