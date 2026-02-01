"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Calendar, Clock, DollarSign, Save, Calculator, Zap } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const DAY_LABELS = [
    { id: 1, short: 'L', label: 'Lunes' },
    { id: 2, short: 'M', label: 'Martes' },
    { id: 3, short: 'M', label: 'Miércoles' },
    { id: 4, short: 'J', label: 'Jueves' },
    { id: 5, short: 'V', label: 'Viernes' },
    { id: 6, short: 'S', label: 'Sábado' },
    { id: 0, short: 'D', label: 'Domingo' },
]

interface PricingRule {
    id: string
    name: string
    price: number
    start_time: string
    end_time: string
    days: number[]
    court_ids?: string[] | null // Optional, if null = all
    is_active: boolean
}

interface Court {
    id: string
    name: string
}

interface PricingRulesManagerProps {
    entityId: string
}

export function PricingRulesManager({ entityId }: PricingRulesManagerProps) {
    const [loading, setLoading] = useState(true)
    const [savingBase, setSavingBase] = useState(false)
    const [basePrice, setBasePrice] = useState<string>('')
    const [specialRules, setSpecialRules] = useState<PricingRule[]>([])

    // Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [creating, setCreating] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [courts, setCourts] = useState<Court[]>([])
    const [newRule, setNewRule] = useState({
        name: '',
        price: '',
        start_time: '18:00',
        end_time: '23:00',
        days: [] as number[],
        court_ids: [] as string[],
        is_active: true
    })

    // Simulator State
    const [simDay, setSimDay] = useState<string>("1")
    const [simTime, setSimTime] = useState("19:00")
    const [simCourt, setSimCourt] = useState<string>("all")

    useEffect(() => {
        loadRules()
    }, [entityId])

    const loadRules = async () => {
        setLoading(true)
        // Fetch Rules
        const { data, error } = await supabase
            .from('pricing_rules')
            .select('*')
            .eq('entity_id', entityId)
            .order('price', { ascending: true })

        // Fetch Courts
        const { data: courtsData } = await supabase
            .from('courts')
            .select('id, name')
            .eq('club_id', entityId)
            .eq('is_active', true)

        if (courtsData) setCourts(courtsData)

        if (data) {
            const base = data.find(r => r.name === 'Tarifa Base')
            if (base) {
                setBasePrice(base.price.toString())
            }
            setSpecialRules(data.filter(r => r.name !== 'Tarifa Base'))
        }
        setLoading(false)
    }

    const handleSaveBasePrice = async () => {
        if (!basePrice) return
        setSavingBase(true)

        try {
            const { data: existing } = await supabase
                .from('pricing_rules')
                .select('id')
                .eq('entity_id', entityId)
                .eq('name', 'Tarifa Base')
                .single()

            if (existing) {
                await supabase.from('pricing_rules').update({
                    price: parseFloat(basePrice),
                    is_active: true
                }).eq('id', existing.id)
            } else {
                await supabase.from('pricing_rules').insert({
                    entity_id: entityId,
                    name: 'Tarifa Base',
                    price: parseFloat(basePrice),
                    days: [0, 1, 2, 3, 4, 5, 6],
                    start_time: '00:00',
                    end_time: '23:59',
                    is_active: true
                })
            }

            toast({ title: "Precio Base Guardado", description: "La tarifa estándar ha sido actualizada." })
            loadRules()

        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setSavingBase(false)
        }
    }

    const generateTimeOptions = () => {
        const times = []
        for (let i = 0; i < 24; i++) {
            const h = i.toString().padStart(2, '0')
            times.push(`${h}:00`)
            times.push(`${h}:30`)
        }
        return times
    }

    const timeOptions = generateTimeOptions()

    const handleEdit = (rule: PricingRule) => {
        setNewRule({
            name: rule.name,
            price: rule.price.toString(),
            start_time: rule.start_time.substring(0, 5),
            end_time: rule.end_time.substring(0, 5),
            days: rule.days,
            court_ids: rule.court_ids || [],
            is_active: rule.is_active
        })
        setEditingId(rule.id)
        setIsCreateOpen(true)
    }

    const openCreateModal = () => {
        setNewRule({ name: '', price: '', start_time: '18:00', end_time: '23:00', days: [], court_ids: [], is_active: true })
        setEditingId(null)
        setIsCreateOpen(true)
    }

    const handleCreateSpecial = async () => {
        if (!newRule.name || !newRule.price || newRule.days.length === 0) {
            toast({ variant: "destructive", title: "Faltan datos", description: "Completa todos los campos." })
            return
        }

        setCreating(true)
        try {
            if (editingId) {
                // UPDATE existing rule
                const { error } = await supabase.from('pricing_rules')
                    .update({
                        name: newRule.name,
                        price: parseFloat(newRule.price),
                        start_time: newRule.start_time,
                        end_time: newRule.end_time,
                        days: newRule.days,
                        court_ids: newRule.court_ids.length > 0 ? newRule.court_ids : null,
                        is_active: newRule.is_active
                    })
                    .eq('id', editingId)

                if (error) throw error
                toast({ title: "Regla Actualizada", description: "Los cambios se han guardado." })
            } else {
                // CREATE new rule
                const { error } = await supabase.from('pricing_rules').insert({
                    entity_id: entityId,
                    name: newRule.name,
                    price: parseFloat(newRule.price),
                    start_time: newRule.start_time,
                    end_time: newRule.end_time,
                    days: newRule.days,
                    court_ids: newRule.court_ids.length > 0 ? newRule.court_ids : null, // null means all
                    is_active: newRule.is_active
                })

                if (error) throw error
                toast({ title: "Regla Creada", description: "Regla especial añadida correctamente." })
            }

            setIsCreateOpen(false)
            setNewRule({ name: '', price: '', start_time: '18:00', end_time: '23:00', days: [], court_ids: [], is_active: true })
            setEditingId(null)

            // Force reload to ensure simulator picks it up
            await loadRules()

        } catch (error: any) {
            console.error(error)
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (confirm("¿Eliminar esta regla?")) {
            await supabase.from('pricing_rules').delete().eq('id', id)
            await loadRules()
        }
    }

    const toggleDay = (dayId: number) => {
        setNewRule(prev => {
            const exists = prev.days.includes(dayId)
            if (exists) return { ...prev, days: prev.days.filter(d => d !== dayId) }
            else return { ...prev, days: [...prev.days, dayId] }
        })
    }

    const toggleCourt = (courtId: string) => {
        setNewRule(prev => {
            const exists = prev.court_ids.includes(courtId)
            if (exists) return { ...prev, court_ids: prev.court_ids.filter(c => c !== courtId) }
            else return { ...prev, court_ids: [...prev.court_ids, courtId] }
        })
    }

    const renderDays = (days: number[]) => {
        if (days.length === 7) return "Todos los días"
        if (days.length === 0) return "Ningún día"
        const sorted = [...days].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
        return sorted.map(d => DAY_LABELS.find(l => l.id === d)?.short).join(", ")
    }

    const getRuleBadgeColor = (name: string) => {
        const lower = name.toLowerCase()
        if (lower.includes('pico')) return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
        if (lower.includes('fin')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
        if (lower.includes('mañana')) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
    }

    // SIMULATOR LOGIC
    const getSimulatedPrice = () => {
        let price = parseFloat(basePrice) || 0
        const timeVal = parseInt(simTime.replace(':', ''))
        const dayVal = parseInt(simDay)

        // Iterate special rules (Last active match wins? Or first?)
        // In the list they are sorted by price ASC (cheaper first).
        // Usually most expensive restrictive rule should win if overlap.
        // Let's iterate all and if match, override.
        // Let's iterate all and if match, override.
        specialRules.forEach(rule => {
            if (!rule.is_active) return
            if (!rule.days.includes(dayVal)) return

            // COURT CHECK: 
            // If rule has specific courts (not null/empty), AND simCourt is specific (not 'all')
            // Then we must check allow list.
            if (simCourt !== 'all' && rule.court_ids && rule.court_ids.length > 0) {
                if (!rule.court_ids.includes(simCourt)) return
            }

            // If simCourt is 'all', we technically can't say if this rule applies "globally".
            // But usually 'all' in simulator means "Show me ANY rule active". 
            // Or better: "Show baseline". 
            // Let's assume if simCourt is 'all', we show rules that apply to ALL (court_ids is null/empty).
            if (simCourt === 'all' && rule.court_ids && rule.court_ids.length > 0) return

            const startVal = parseInt(rule.start_time.replace(':', ''))
            const endVal = parseInt(rule.end_time.replace(':', ''))

            if (timeVal >= startVal && timeVal < endVal) {
                // Determine if we override? 
                // For simulator, let's say "Last one in list implies Higher Priority" if we followed that logic?
                // Actually if sorted by price (asc), the most expensive one is last.
                // So overriding sequentially works perfectly for "Highest Price Wins".
                price = rule.price
            }
        })
        return price
    }

    const simulatedPrice = getSimulatedPrice()
    const activeRuleName = specialRules.find(r => r.price === simulatedPrice && r.days.includes(parseInt(simDay)) && /* rough check */ r.is_active)?.name

    if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-8">

            {/* BASE PRICE SECTION */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#ccff00]/10 rounded-full">
                        <DollarSign className="w-5 h-5 text-[#ccff00]" />
                    </div>
                    <div>
                        <h3 className="font-medium text-white">Precio Base Estándar</h3>
                        <p className="text-xs text-zinc-400">Este precio se aplica cuando no hay reglas especiales activas.</p>
                    </div>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="space-y-2 flex-1 max-w-[200px]">
                        <Label>Precio por Hora ($)</Label>
                        <Input
                            type="number"
                            value={basePrice}
                            onChange={(e) => setBasePrice(e.target.value)}
                            className="bg-zinc-950 border-zinc-800 text-lg font-semibold h-12"
                            placeholder="0.00"
                        />
                    </div>
                    <Button
                        onClick={handleSaveBasePrice}
                        disabled={savingBase}
                        className="bg-zinc-100 text-zinc-900 hover:bg-zinc-300 h-12 px-6"
                    >
                        {savingBase ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Actualizar Base
                    </Button>
                </div>
            </div>

            <div className="border-t border-zinc-800 my-4" />

            {/* SPECIAL RULES SECTION */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="font-medium text-white flex items-center gap-2">
                            Reglas Especiales
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{specialRules.length}</span>
                        </h3>
                        <p className="text-xs text-zinc-400">Tienen prioridad sobre el precio base (ej. Hora Pico, Fin de Semana).</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={openCreateModal}
                        className="bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Regla
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>{editingId ? "Editar Regla" : "Crear Regla Especial"}</DialogTitle>
                                <DialogDescription>Sobrescribe el precio base en horarios específicos.</DialogDescription>
                            </DialogHeader>
                            {/* FORM CONTENT */}
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Nombre (Etiqueta)</Label>
                                    <Input
                                        placeholder="Ej: Hora Pico Noche"
                                        className="bg-zinc-900 border-zinc-800"
                                        value={newRule.name}
                                        onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nuevo Precio ($)</Label>
                                        <Input
                                            type="number"
                                            className="bg-zinc-900 border-zinc-800"
                                            value={newRule.price}
                                            onChange={e => setNewRule({ ...newRule, price: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2 flex flex-col justify-end pb-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Switch
                                                checked={newRule.is_active}
                                                onCheckedChange={c => setNewRule({ ...newRule, is_active: c })}
                                            />
                                            <Label>Habilitada</Label>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Aplicar a canchas (Opcional)</Label>
                                    <div className="flex flex-wrap gap-2">
                                        <div
                                            onClick={() => setNewRule(prev => ({ ...prev, court_ids: [] }))}
                                            className={`
                                                px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors select-none border
                                                ${newRule.court_ids.length === 0 ? 'bg-zinc-100 text-zinc-900 border-zinc-200' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}
                                            `}
                                        >
                                            Todas
                                        </div>
                                        {courts.map(court => {
                                            const isSelected = newRule.court_ids.includes(court.id)
                                            return (
                                                <div
                                                    key={court.id}
                                                    onClick={() => toggleCourt(court.id)}
                                                    className={`
                                                        px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors select-none border
                                                        ${isSelected ? 'bg-[#ccff00]/10 text-[#ccff00] border-[#ccff00]/50' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'}
                                                    `}
                                                >
                                                    {court.name}
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 text-right">
                                        {newRule.court_ids.length === 0 ? "Aplica a todas las canchas" : `Selection: ${newRule.court_ids.length} cancha(s)`}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>Días de la semana</Label>
                                    <div className="flex gap-2 justify-between">
                                        {DAY_LABELS.map(d => {
                                            const isSelected = newRule.days.includes(d.id)
                                            return (
                                                <div
                                                    key={d.id}
                                                    onClick={() => toggleDay(d.id)}
                                                    className={`
                                                        w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-all select-none
                                                        ${isSelected ? 'bg-[#ccff00] text-black scale-110' : 'bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-600'}
                                                    `}
                                                    title={d.label}
                                                >
                                                    {d.short}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Desde</Label>
                                        <Select
                                            value={newRule.start_time}
                                            onValueChange={v => setNewRule({ ...newRule, start_time: v })}
                                        >
                                            <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Hasta</Label>
                                        <Select
                                            value={newRule.end_time}
                                            onValueChange={v => setNewRule({ ...newRule, end_time: v })}
                                        >
                                            <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateSpecial} disabled={creating} className="bg-[#ccff00] text-black">
                                    {creating ? 'Guardando...' : (editingId ? 'Actualizar Regla' : 'Crear Regla')}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="space-y-3">
                    {specialRules.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500 bg-zinc-900/20 rounded-lg border border-zinc-800 border-dashed">
                            No tienes reglas especiales. <br /> Se aplicará el precio base ($ {basePrice || '?'}) en todo momento.
                        </div>
                    ) : (
                        specialRules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg group hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-md border ${getRuleBadgeColor(rule.name)}`}>
                                            {rule.name}
                                        </span>
                                        {!rule.is_active && (
                                            <span className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-700">Inactiva</span>
                                        )}
                                    </div>
                                    <div className="flex gap-4 text-xs text-zinc-400 pl-1">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {renderDays(rule.days)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {rule.start_time.substring(0, 5)} - {rule.end_time.substring(0, 5)}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-[#ccff00] change-num">${rule.price}</span>

                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Edit Button */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={() => handleEdit(rule)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </Button>

                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(rule.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* SIMULATOR */}
            <div className="mt-8 bg-black/20 p-4 rounded-xl border border-zinc-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4 text-zinc-400 text-sm font-medium">
                    <Calculator className="w-4 h-4" />
                    Simulador de Precios
                </div>
                <div className="flex items-end gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">Día de prueba</Label>
                        <Select value={simDay} onValueChange={setSimDay}>
                            <SelectTrigger className="w-[120px] bg-zinc-900 border-zinc-800 h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DAY_LABELS.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-zinc-500">Hora</Label>
                        <Select
                            value={simTime}
                            onValueChange={setSimTime}
                        >
                            <SelectTrigger className="w-[120px] bg-zinc-900 border-zinc-800 h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="ml-auto flex flex-col items-end">
                        <span className="text-xs text-zinc-500 mb-1">Precio Resultante</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white">${simulatedPrice}</span>
                            {simulatedPrice !== parseFloat(basePrice) && (
                                <div className="flex items-center gap-1 text-[10px] bg-[#ccff00]/10 text-[#ccff00] px-1.5 py-0.5 rounded border border-[#ccff00]/20">
                                    <Zap className="w-3 h-3" />
                                    Regla Activa
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
