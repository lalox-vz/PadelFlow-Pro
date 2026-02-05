"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { OnboardingStepper } from "../components/OnboardingStepper"
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, MapPin, Building2, Store, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Business } from "@/types/business"
import confetti from "canvas-confetti"
import PhoneInput, { Country as PhoneCountry } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Country, City, ICity, ICountry } from 'country-state-city'
import Image from "next/image"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// 3 Logical Steps
const STEPS = [
    { id: 1, label: "Identidad" },
    { id: 2, label: "Configuración" },
    { id: 3, label: "Listo" }
]

export default function ClubOnboardingPage() {
    const { user, profile } = useAuth()
    const router = useRouter()
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [step, setStep] = useState(1)

    // Form State
    const [formData, setFormData] = useState<Partial<Business>>({
        name: "",
        phone: "",
        city: "",
        court_count: 3,
        operating_hours: { start: "07:00", end: "23:00" },
    })

    // Location & Phone Logic
    const [locationOpen, setLocationOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [selectedCountryCode, setSelectedCountryCode] = useState<PhoneCountry | undefined>("VE")

    // Memoized Cities Search
    const filteredLocations = useMemo(() => {
        if (!query || query.length < 3) return []

        const lowerQuery = query.toLowerCase()
        const allCountries = Country.getAllCountries()
        const matches: { label: string, value: string, isoCode: string, countryCode: string }[] = []

        // Search Countries first
        const countryMatches = allCountries.filter(c => c.name.toLowerCase().includes(lowerQuery))
        countryMatches.forEach(c => matches.push({
            label: c.name,
            value: c.name,
            isoCode: c.isoCode,
            countryCode: c.isoCode
        }))

        if (matches.length > 10) return matches.slice(0, 50)

        // Then Cities
        const allCities = City.getAllCities()
        let count = 0
        for (const city of allCities) {
            if (count > 50) break
            const matchName = city.name.toLowerCase()
            if (matchName.includes(lowerQuery)) {
                matches.push({
                    label: `${city.name}, ${city.countryCode}`,
                    value: `${city.name}, ${city.countryCode}`,
                    isoCode: city.countryCode,
                    countryCode: city.countryCode
                })
                count++
            }
        }
        return matches

    }, [query])

    // Load existing data
    useEffect(() => {
        const loadData = async () => {
            if (!user) return

            try {
                // Check if club entity exists (DRAFT)
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
                        phone: details.phone || entity.phone || "",
                        city: details.location || prev.city,
                        ...details,
                        operating_hours: details.operating_hours || prev.operating_hours,
                    }))

                    // STATELESS STEP INFERENCE
                    // If we have an entity draft, we are at least at Step 2.
                    // We default to Step 2 to allow the user to review their configuration 
                    // before moving to the final "Ready" screen (Step 3).
                    // This avoids storing 'step' in the User Profile, keeping it pure.
                    setStep(2)
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

    const handleLocationSelect = (loc: { label: string, countryCode: string }) => {
        updateField('city', loc.label)
        setLocationOpen(false)
        if (loc.countryCode) {
            setSelectedCountryCode(loc.countryCode as PhoneCountry)
        }
    }

    // --- EXIT HANDLERS ---

    // 1. Guardar y Salir (Pause)
    const handleSaveAndExit = async () => {
        // Pure exit. No updates to User Profile.
        window.location.href = '/'
    }

    // 2. Descartar y Salir (Destroy)
    const handleDiscardAndExit = async () => {
        if (!user) return
        setLoading(true)
        try {
            // Delete the entity draft
            await supabase.from('entities').delete().eq('owner_id', user.id).eq('type', 'CLUB')

            // Clean User State (Just in case, though we try to keep it clean)
            // Ideally we wouldn't need this if we never touched it, but for safety:
            await supabase.from('users').update({
                onboarding_step: 1,
                business_type: null
            }).eq('id', user.id)

            // Clean Local Storage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('padelflow_user_role')
            }

            window.location.href = '/'
        } catch (error) {
            console.error(error)
            window.location.href = '/'
        }
    }

    const handleNext = async () => {
        if (!user) return
        setSaving(true)

        try {
            // --- VALIDATION & BUSINESS RULES ---
            if (step === 1) {
                if (!formData.name) throw new Error("El nombre del club es obligatorio.")
                if (!formData.phone) throw new Error("El teléfono es obligatorio.")
                if (!formData.city) throw new Error("La ubicación es obligatoria.")

                const { data: currentDraft } = await supabase.from('entities').select('id').eq('owner_id', user.id).eq('type', 'CLUB').single()
                const draftId = currentDraft?.id

                let query = supabase.from('entities')
                    .select('id, name, details')
                    .eq('type', 'CLUB')
                    .ilike('name', formData.name)

                const { data: possibleDupes } = await query

                if (possibleDupes && possibleDupes.length > 0) {
                    const isDuplicate = possibleDupes.some(d => {
                        if (d.id === draftId) return false
                        const loc = d.details?.location as string
                        return loc && loc.toLowerCase() === formData.city?.toLowerCase()
                    })

                    if (isDuplicate) {
                        throw new Error("Ya existe un club registrado con ese nombre en esta ciudad.")
                    }
                }
            }

            // --- SAVE DRAFT (Entities Only) ---
            let entityId = null
            const { data: existingEntity } = await supabase
                .from('entities')
                .select('id')
                .eq('owner_id', user.id)
                .eq('type', 'CLUB')
                .single()

            if (existingEntity) entityId = existingEntity.id

            const { name, phone, city, ...rest } = formData
            const detailsData = {
                ...rest,
                phone: phone,
                location: city,
            }

            let error = null
            if (entityId) {
                const { error: updateError } = await supabase
                    .from('entities')
                    .update({
                        name: name,
                        details: detailsData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', entityId)
                error = updateError
            } else {
                const { data: newId, error: createError } = await supabase
                    .rpc('create_business_entity', {
                        p_name: name || '',
                        p_type: 'CLUB',
                        p_slug: (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
                        p_user_id: user.id
                    })

                if (newId) {
                    entityId = newId
                    await supabase
                        .from('entities')
                        .update({ details: detailsData })
                        .eq('id', newId)
                }
                error = createError
            }

            if (error) throw error

            // --- NAVIGATION (PURE) ---
            if (step === 3) {
                await handleGraduation(entityId)
            } else {
                const nextStep = step + 1
                // PURE NAVIGATION: We do NOT update the User Profile here.
                setStep(nextStep)
            }

        } catch (error: any) {
            console.error(error)
            toast({ title: "Atención", description: error.message || "Error al guardar", variant: "destructive" })
        } finally {
            setSaving(false)
        }
    }

    const handleGraduation = async (entityId: string | null) => {
        if (!entityId) return

        try {
            const { count: courtsCount } = await supabase.from('courts').select('*', { count: 'exact', head: true }).eq('club_id', entityId)
            if (courtsCount === 0 && (formData.court_count || 0) > 0) {
                const courtsToInsert = Array.from({ length: formData.court_count || 3 }).map((_, i) => ({
                    club_id: entityId,
                    name: `Cancha ${i + 1}`,
                    is_active: true,
                    details: {
                        surface: 'artificial_grass',
                        is_covered: false
                    }
                }))
                await supabase.from('courts').insert(courtsToInsert)
            }

            const { count: hoursCount } = await supabase.from('opening_hours').select('*', { count: 'exact', head: true }).eq('entity_id', entityId)
            if (hoursCount === 0) {
                const days = [0, 1, 2, 3, 4, 5, 6]
                const hoursPayload = days.map(d => ({
                    entity_id: entityId,
                    day_of_week: d,
                    open_time: formData.operating_hours?.start || '07:00',
                    close_time: formData.operating_hours?.end || '23:00'
                }))
                await supabase.from('opening_hours').insert(hoursPayload)
            }
        } catch (err) {
            console.error("Auto-population error", err)
        }

        // --- THE EXECUTION (FINAL STEP 4) ---
        // ONLY HERE we touch the user profile.
        console.log("GRADUATION: Promoting user to CLUB OWNER")

        const { error: roleError } = await supabase
            .from('users')
            .update({
                role: 'club_owner',
                organization_id: entityId,
                has_business: true,
                business_type: 'club',
                onboarding_status: 'completed',
                onboarding_step: 4
            })
            .eq('id', user?.id)

        if (roleError) throw roleError

        await supabase.auth.updateUser({
            data: {
                role: 'club_owner',
                organization_id: entityId,
                business_type: 'club'
            }
        })

        await supabase.auth.refreshSession()

        if (typeof window !== 'undefined') {
            localStorage.setItem('padelflow_user_role', 'club_owner')
        }

        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#ccff00', '#ffffff', '#000000']
        })

        toast({
            title: "¡Felicidades!",
            description: "Tu club ha sido creado exitosamente.",
            className: "bg-[#ccff00] text-black border-none"
        })

        setTimeout(() => {
            window.location.href = '/club/dashboard'
        }, 1500)
    }

    const handleBack = async () => {
        if (step > 1) {
            const prevStep = step - 1
            setStep(prevStep)
        }
    }

    const handleStepClick = async (targetStep: number) => {
        if (targetStep < step) {
            setStep(targetStep)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-[#ccff00]" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 relative flex flex-col items-center">
            {/* Header: Logo & Exit */}
            <div className="w-full max-w-4xl flex justify-between items-center pt-6 mb-12">

                {/* Logo Trigger */}
                <div onClick={() => setIsExitDialogOpen(true)} className="cursor-pointer group">
                    <Image
                        src="/logo.svg"
                        alt="PadelFlow"
                        width={140}
                        height={45}
                        className="h-10 w-auto opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                </div>

                {/* Exit Text Trigger */}
                <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <button className="text-zinc-500 hover:text-white transition-colors text-sm font-medium">
                            Salir
                        </button>
                    </AlertDialogTrigger>

                    {/* GOD LEVEL EXIT MODAL */}
                    <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">¿Deseas salir?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                                Tu progreso actual se encuentra en el borrador.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="flex flex-col gap-3 mt-4">
                            <AlertDialogAction
                                onClick={handleSaveAndExit}
                                className="w-full bg-[#ccff00] text-black hover:bg-[#b3e600] font-bold h-12"
                            >
                                Guardar y Salir
                            </AlertDialogAction>

                            <button
                                onClick={handleDiscardAndExit}
                                className="w-full h-12 rounded-md border border-red-900/50 text-red-500 hover:bg-red-950/30 hover:text-red-400 transition-colors font-medium flex items-center justify-center"
                            >
                                Descartar Borrador y Salir
                            </button>

                            <AlertDialogCancel className="w-full bg-transparent border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white h-12 mt-2">
                                Cancelar
                            </AlertDialogCancel>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <div className="w-full max-w-2xl">
                <OnboardingStepper
                    currentStep={step}
                    steps={STEPS}
                    onStepClick={handleStepClick}
                />

                <div className="mt-12 bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
                    {/* Decorative shimmer */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-20" />

                    {/* STEP 1: IDENTIDAD */}
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight text-white">Identidad del Club</h2>
                                <p className="text-zinc-400 text-lg">Cuéntanos sobre tu negocio.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-base text-zinc-300">Nombre del Club</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500" />
                                        <Input
                                            value={formData.name || ''}
                                            onChange={(e) => updateField('name', e.target.value)}
                                            placeholder="Ej: Padel Flow Center"
                                            className="pl-10 h-14 bg-zinc-950/50 border-zinc-800 focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] text-lg rounded-lg transition-all"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-base text-zinc-300">Ubicación Global</Label>
                                    <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={locationOpen}
                                                className="w-full justify-between h-14 bg-zinc-950/50 border-zinc-800 hover:bg-zinc-900 text-left font-normal text-lg rounded-lg hover:border-zinc-700 transition-all"
                                            >
                                                {formData.city ? (
                                                    <span className="text-white">{formData.city}</span>
                                                ) : (
                                                    <span className="text-zinc-500 flex items-center"><MapPin className="mr-2 h-4 w-4" /> Buscar ciudad o país...</span>
                                                )}

                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0 bg-zinc-950 border-zinc-800 shadow-2xl">
                                            <Command shouldFilter={false} className="bg-zinc-950">
                                                <div className="border-b border-zinc-800 px-3 flex items-center">
                                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-white" />
                                                    <CommandInput
                                                        placeholder="Escribe al menos 3 letras..."
                                                        className="h-12 border-none focus:ring-0 text-white placeholder:text-zinc-600"
                                                        value={query}
                                                        onValueChange={setQuery}
                                                    />
                                                </div>
                                                <CommandList className="max-h-[300px]">
                                                    {filteredLocations.length === 0 ? (
                                                        <div className="py-6 text-center text-sm text-zinc-500">
                                                            {query.length < 3 ? "Sigue escribiendo..." : "No encontrado."}
                                                        </div>
                                                    ) : (
                                                        <CommandGroup>
                                                            {filteredLocations.map((loc) => (
                                                                <CommandItem
                                                                    key={`${loc.value}-${Math.random()}`} // Value ensures uniqueness
                                                                    value={loc.label}
                                                                    onSelect={() => handleLocationSelect(loc)}
                                                                    className="text-white hover:bg-zinc-900 cursor-pointer py-3"
                                                                >
                                                                    <MapPin className="mr-2 h-4 w-4 text-[#ccff00]" />
                                                                    {loc.label}
                                                                    {formData.city === loc.label && <CheckCircle2 className="ml-auto h-4 w-4 text-[#ccff00]" />}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    )}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-base text-zinc-300">Teléfono Oficial</Label>
                                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-4 py-2 focus-within:ring-1 focus-within:ring-[#ccff00] focus-within:border-[#ccff00] transition-all">
                                        <PhoneInput
                                            placeholder="Introduce tu número"
                                            value={formData.phone || undefined}
                                            onChange={(val) => updateField('phone', val)}
                                            defaultCountry={selectedCountryCode}
                                            className="phone-input-dark"
                                            numberInputProps={{
                                                className: "flex h-10 w-full rounded-md bg-transparent px-3 text-lg shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 text-white border-none focus:ring-0"
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: CONFIGURACIÓN */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight text-white">Tu Club</h2>
                                <p className="text-zinc-400 text-lg">Define tu capacidad y horarios.</p>
                            </div>

                            <div className="grid gap-8">
                                {/* Courts Pills */}
                                <div className="space-y-4">
                                    <Label className="text-base text-zinc-300">¿Cuántas canchas tienes?</Label>
                                    <div className="flex flex-wrap gap-3">
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                            <button
                                                key={num}
                                                onClick={() => updateField('court_count', num)}
                                                className={cn(
                                                    "w-14 h-14 rounded-xl font-bold text-xl transition-all border border-transparent",
                                                    formData.court_count === num
                                                        ? "bg-[#ccff00] text-black shadow-[0_0_20px_rgba(204,255,0,0.3)] scale-110 border-[#ccff00]"
                                                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border-zinc-700"
                                                )}
                                            >
                                                {num === 8 ? '8+' : num}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Hours Unified */}
                                <div className="space-y-4">
                                    <Label className="text-base text-zinc-300">Horario de Atención</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider ml-1">Apertura</span>
                                            <div className="relative">
                                                <Input
                                                    type="time"
                                                    value={formData.operating_hours?.start}
                                                    onChange={(e) => updateNestedField('operating_hours', 'start', e.target.value)}
                                                    className="bg-zinc-950 border-zinc-800 h-14 text-lg px-4"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider ml-1">Cierre</span>
                                            <div>
                                                <Input
                                                    type="time"
                                                    value={formData.operating_hours?.end}
                                                    onChange={(e) => updateNestedField('operating_hours', 'end', e.target.value)}
                                                    className="bg-zinc-950 border-zinc-800 h-14 text-lg px-4"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SUCCESS */}
                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center text-center py-8 animate-in fade-in zoom-in duration-500">
                            <div className="h-24 w-24 bg-[#ccff00]/10 rounded-full flex items-center justify-center mb-6">
                                <Store className="h-12 w-12 text-[#ccff00]" />
                            </div>
                            <h2 className="text-4xl font-bold text-white mb-4">¡Todo listo!</h2>
                            <p className="text-zinc-400 max-w-md text-lg mx-auto">
                                Tu espacio de trabajo ha sido creado.
                                <br />
                                Ahora puedes administrar tus canchas, reservas y equipo desde el Dashboard.
                            </p>

                            <div className="mt-10 w-full max-w-sm">
                                <Button
                                    onClick={handleNext}
                                    className="w-full h-14 text-lg font-bold bg-[#ccff00] text-black hover:bg-[#b3e600] hover:scale-105 transition-all shadow-[0_0_20px_rgba(204,255,0,0.4)]"
                                >
                                    Ir a mi Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls (Only for Steps 1 & 2) */}
                {step < 3 && (
                    <div className="flex justify-between items-center mt-12 w-full">
                        <Button
                            variant="ghost"
                            onClick={handleBack}
                            disabled={step === 1 || saving}
                            className={cn("text-zinc-500 hover:text-white transition-opacity", step === 1 && "opacity-0 pointer-events-none")}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Atrás
                        </Button>

                        <Button
                            onClick={handleNext}
                            disabled={saving}
                            className="bg-white text-black hover:bg-zinc-200 px-8 h-12 font-medium"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    Siguiente <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
