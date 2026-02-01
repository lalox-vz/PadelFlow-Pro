"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OnboardingStepper } from "../components/OnboardingStepper"
import { Loader2, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Business, CoachInfo, ProgramInfo } from "@/types/business"
import { Card } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import confetti from "canvas-confetti"

const STEPS = [
    { id: 1, label: "Perfil" },
    { id: 2, label: "Staff" },
    { id: 3, label: "Programas" },
    { id: 4, label: "Logística" }
]

export default function AcademyOnboardingPage() {
    const { user, profile } = useAuth()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [step, setStep] = useState(1)

    // Form State
    const [formData, setFormData] = useState<Partial<Business>>({
        name: "",
        specialty: "",
        city: "",
        state: "",
        phone: "",
        email: "",
        registration_fee: 0,
        monthly_fee: 0,
        coaches: [],
        programs: [],
        payment_methods: [
            { type: 'cash', enabled: true, require_proof: false },
            { type: 'zelle', enabled: false },
            { type: 'pago_movil', enabled: false }
        ]
    })

    const [coachInput, setCoachInput] = useState({ name: "", specialty: "" })
    const [programInput, setProgramInput] = useState({ name: "", description: "" })
    const [availableClubs, setAvailableClubs] = useState<Array<{ id: string, name: string }>>([])

    // Load existing data and available clubs
    useEffect(() => {
        const loadData = async () => {
            if (!user) return

            try {
                // Fetch available clubs for selection
                const { data: clubs } = await supabase
                    .from('entities')
                    .select('id, name')
                    .eq('type', 'CLUB')
                    .order('name')

                setAvailableClubs(clubs || [])

                // Fetch existing academy data
                const { data: entity } = await supabase
                    .from('entities')
                    .select('*')
                    .eq('owner_id', user.id)
                    .eq('type', 'ACADEMY')
                    .single()

                if (entity) {
                    const details = entity.details || {}
                    setFormData(prev => ({
                        ...prev,
                        name: entity.name,
                        host_club_id: entity.host_club_id,
                        ...details,
                        coaches: details.coaches || [],
                        programs: details.programs || [],
                        payment_methods: details.payment_methods || prev.payment_methods
                    }))
                }

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

    // Coach Management
    const addCoach = () => {
        if (!coachInput.name) return
        const newCoach: CoachInfo = {
            id: crypto.randomUUID(),
            name: coachInput.name,
            specialty: coachInput.specialty
        }
        setFormData(prev => ({ ...prev, coaches: [...(prev.coaches || []), newCoach] }))
        setCoachInput({ name: "", specialty: "" })
    }

    const removeCoach = (id: string) => {
        setFormData(prev => ({ ...prev, coaches: prev.coaches?.filter(c => c.id !== id) }))
    }

    // Program Management
    const addProgram = () => {
        if (!programInput.name) return
        const newProgram: ProgramInfo = {
            id: crypto.randomUUID(),
            name: programInput.name,
            description: programInput.description
        }
        setFormData(prev => ({ ...prev, programs: [...(prev.programs || []), newProgram] }))
        setProgramInput({ name: "", description: "" })
    }

    const removeProgram = (id: string) => {
        setFormData(prev => ({ ...prev, programs: prev.programs?.filter(p => p.id !== id) }))
    }


    const handleNext = async () => {
        if (!user) return
        setSaving(true)

        try {
            if (step === 1 && !formData.name) {
                toast({ title: "Error", description: "El nombre de la academia es obligatorio", variant: "destructive" })
                setSaving(false)
                return
            }

            // Sync with Entities Table
            let entityId = null
            const { data: existingEntity } = await supabase
                .from('entities')
                .select('id')
                .eq('owner_id', user.id)
                .eq('type', 'ACADEMY')
                .single()

            if (existingEntity) entityId = existingEntity.id

            const { name, ...detailsData } = formData

            const payload = {
                owner_id: user.id,
                type: 'ACADEMY',
                name: name,
                host_club_id: (formData as any).host_club_id || null,
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

            const nextStep = step + 1
            if (nextStep <= 4) {
                await supabase.rpc('update_user_onboarding', {
                    p_business_type: 'academy',
                    p_status: 'in_progress',
                    p_step: nextStep
                })
                setStep(nextStep)
            } else {
                // Onboarding completed - save coaches to academy_coaches table
                await supabase.rpc('update_user_onboarding', {
                    p_business_type: 'academy',
                    p_status: 'completed',
                    p_step: 4
                })

                // CRITICAL: Linking User to Entity
                const { error: roleError } = await supabase
                    .from('users')
                    .update({
                        role: 'academy_owner',
                        organization_id: entityId, // Link to the new/updated entity
                        has_business: true,
                        business_type: 'academy'
                    })
                    .eq('id', user.id)

                if (roleError) {
                    console.error('Error updating role:', roleError)
                }

                // CRITICAL: Update Auth Session Metadata immediately
                const { error: authError } = await supabase.auth.updateUser({
                    data: {
                        role: 'academy_owner',
                        organization_id: entityId,
                        business_type: 'academy'
                    }
                })
                if (authError) console.error('Error updating auth metadata:', authError)

                // CRITICAL: Update localStorage cache immediately
                if (typeof window !== 'undefined') {
                    localStorage.setItem('padelflow_user_role', 'academy_owner')
                    console.log('AUTH: Role updated to academy_owner and cached')
                }

                // Get the final entity ID
                const { data: finalEntity } = await supabase
                    .from('entities')
                    .select('id')
                    .eq('owner_id', user.id)
                    .eq('type', 'ACADEMY')
                    .single()

                if (finalEntity && formData.coaches && formData.coaches.length > 0) {
                    // Insert coaches into academy_coaches table
                    const coachesData = formData.coaches.map((coach: CoachInfo) => ({
                        academy_id: finalEntity.id,
                        name: coach.name,
                        specialty: coach.specialty || null,
                        status: 'active'
                    }))

                    const { error: coachesError } = await supabase
                        .from('academy_coaches')
                        .insert(coachesData)

                    if (coachesError) {
                        console.error('Error inserting coaches:', coachesError)
                        // Don't block completion, just log it
                    }
                }

                toast({ title: "¡Felicidades!", description: "Tu academia ha sido registrada." })

                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                })

                await new Promise(resolve => setTimeout(resolve, 2000))

                // Force a hard reload to ensure AuthContext re-initializes and picks up the new role
                window.location.href = '/academy/dashboard'
                // router.refresh() - No longer needed with hard reload
            }

        } catch (error: any) {
            console.error(error)
            toast({ title: "Error", description: error.message || "Error al guardar", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    const handleBack = async () => {
        if (step > 1) {
            const prevStep = step - 1
            setStep(prevStep)
            if (user) {
                await supabase.from('users').update({ onboarding_step: prevStep }).eq('id', user.id)
            }
        }
    }

    if (loading) return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-[#ccff00]" /></div>

    return (
        <div className="min-h-screen bg-background text-foreground p-6">
            <div className="max-w-4xl mx-auto pt-10">
                <OnboardingStepper
                    currentStep={step}
                    steps={STEPS}
                    onStepClick={(stepId) => setStep(stepId)}
                />

                <div className="mt-8">
                    {/* STEP 1: PROFILE */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold">Perfil de la Academia</h2>
                            <p className="text-muted-foreground">Datos generales de tu institución.</p>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Nombre de la Academia</Label>
                                    <Input
                                        value={formData.name || ''}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        placeholder="Ej: Padel Academy Pro"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Club Anfitrión *</Label>
                                    <Select
                                        value={(formData as any).host_club_id || ''}
                                        onValueChange={(value) => updateField('host_club_id' as any, value)}
                                    >
                                        <SelectTrigger className={!(formData as any).host_club_id ? 'border-[#ccff00]' : ''}>
                                            <SelectValue placeholder="Selecciona el club donde operas" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableClubs.length === 0 ? (
                                                <SelectItem value="none" disabled>No hay clubs disponibles</SelectItem>
                                            ) : (
                                                availableClubs.map(club => (
                                                    <SelectItem key={club.id} value={club.id}>
                                                        {club.name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Tu academia operará en las instalaciones de este club
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Especialidad Principal</Label>
                                    <Input
                                        value={formData.specialty || ''}
                                        onChange={(e) => updateField('specialty', e.target.value)}
                                        placeholder="Ej: Formación Juniors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input
                                        value={formData.phone || ''}
                                        onChange={(e) => updateField('phone', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        value={formData.email || ''}
                                        onChange={(e) => updateField('email', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ciudad</Label>
                                    <Input
                                        value={formData.city || ''}
                                        onChange={(e) => updateField('city', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Estado</Label>
                                    <Input
                                        value={formData.state || ''}
                                        onChange={(e) => updateField('state', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: STAFF */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold">Staff de Entrenadores</h2>
                            <p className="text-muted-foreground">Registra a tu equipo técnico.</p>

                            <Card className="p-4 bg-muted/20 border-muted">
                                <div className="flex gap-4 items-end mb-4">
                                    <div className="flex-1 space-y-2">
                                        <Label>Nombre del Coach</Label>
                                        <Input
                                            value={coachInput.name}
                                            onChange={(e) => setCoachInput(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label>Especialidad</Label>
                                        <Input
                                            value={coachInput.specialty}
                                            onChange={(e) => setCoachInput(prev => ({ ...prev, specialty: e.target.value }))}
                                            placeholder="Ej: Físico, Técnico"
                                        />
                                    </div>
                                    <Button onClick={addCoach} disabled={!coachInput.name} className="bg-[#ccff00] text-black hover:bg-[#b5952f]">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {formData.coaches?.map(coach => (
                                        <div key={coach.id} className="flex justify-between items-center bg-background p-3 rounded border border-muted">
                                            <div>
                                                <p className="font-medium">{coach.name}</p>
                                                <p className="text-sm text-muted-foreground">{coach.specialty}</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => removeCoach(coach.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!formData.coaches || formData.coaches.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No hay coaches registrados aún.</p>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* STEP 3: PROGRAMS */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold">Programas de Entrenamiento</h2>
                            <p className="text-muted-foreground">¿Qué servicios ofreces?</p>

                            <Card className="p-4 bg-muted/20 border-muted">
                                <div className="flex gap-4 items-end mb-4">
                                    <div className="flex-1 space-y-2">
                                        <Label>Nombre del Programa</Label>
                                        <Input
                                            value={programInput.name}
                                            onChange={(e) => setProgramInput(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Ej: Escuela de Niños"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label>Descripción Breve</Label>
                                        <Input
                                            value={programInput.description}
                                            onChange={(e) => setProgramInput(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Ej: Lunes y Miércoles 4pm"
                                        />
                                    </div>
                                    <Button onClick={addProgram} disabled={!programInput.name} className="bg-[#ccff00] text-black hover:bg-[#b5952f]">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {formData.programs?.map(prog => (
                                        <div key={prog.id} className="flex justify-between items-center bg-background p-3 rounded border border-muted">
                                            <div>
                                                <p className="font-medium">{prog.name}</p>
                                                <p className="text-sm text-muted-foreground">{prog.description}</p>
                                            </div>
                                            <Button variant="ghost" size="sm" onClick={() => removeProgram(prog.id)}>
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!formData.programs || formData.programs.length === 0) && (
                                        <p className="text-sm text-muted-foreground text-center py-4">No hay programas registrados aún.</p>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* STEP 4: LOGISTICS */}
                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold">Logística y Pagos</h2>
                            <p className="text-muted-foreground">Define tus tarifas y métodos de cobro.</p>

                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Matrícula / Inscripción ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.registration_fee || 0}
                                        onChange={(e) => updateField('registration_fee', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mensualidad Promedio ($)</Label>
                                    <Input
                                        type="number"
                                        value={formData.monthly_fee || 0}
                                        onChange={(e) => updateField('monthly_fee', parseFloat(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="border border-muted rounded-lg p-6 space-y-4 bg-muted/20 mt-4">
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
                                                        Requerir foto del billete/pago (Opcional)
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
                                                                // Handle both string (legacy) and object formats
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
                                                            value={typeof method.details === 'string' ? method.details : ''}
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
                </div>
            </div>
        </div>
    )
}
