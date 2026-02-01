"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Save, Minus, Plus, HelpCircle, Info } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface RulesSectionProps {
    initialData: any
    onUpdate: () => void
}

export function RulesSection({ initialData, onUpdate }: RulesSectionProps) {
    const [formData, setFormData] = useState(initialData)
    const [loading, setLoading] = useState(false)

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }))
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await supabase
                .from('entities')
                .update({
                    default_duration: formData.default_duration,
                    cancellation_window: formData.cancellation_window,
                    advance_booking_days: formData.advance_booking_days
                })
                .eq('id', formData.id)

            if (error) throw error
            toast({ title: "Reglas Actualizadas", description: "La configuración operativa se ha guardado." })
            onUpdate()
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setLoading(false)
        }
    }

    const Stepper = ({
        value,
        onChange,
        min,
        max,
        step = 1,
        suffix = "",
        description = ""
    }: {
        value: number,
        onChange: (v: number) => void,
        min: number,
        max: number,
        step?: number,
        suffix?: string,
        description?: string
    }) => (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800 w-fit">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md"
                    onClick={() => onChange(Math.max(min, value - step))}
                    disabled={value <= min}
                >
                    <Minus className="w-4 h-4" />
                </Button>
                <div className="min-w-[4rem] text-center font-bold text-white">
                    {value}<span className="text-xs font-normal text-zinc-500 ml-1">{suffix}</span>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md"
                    onClick={() => onChange(Math.min(max, value + step))}
                    disabled={value >= max}
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
            {description && <p className="text-xs text-zinc-500 max-w-[200px] leading-snug">{description}</p>}
        </div>
    )

    return (
        <Card className="border-border bg-card">
            <CardHeader>
                <CardTitle>Reglas de Operación</CardTitle>
                <CardDescription>Define los límites y condiciones para las reservas automáticas.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-8 max-w-3xl">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* DURATION */}
                        <div className="space-y-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-800 transition-colors">
                            <div className="flex items-center gap-2">
                                <Label className="text-base">Duración del Turno</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger><Info className="w-4 h-4 text-zinc-500" /></TooltipTrigger>
                                        <TooltipContent>Tiempo estándar de bloque en el calendario.</TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <Select
                                value={String(formData.default_duration || 90)}
                                onValueChange={(val) => handleChange('default_duration', parseInt(val))}
                            >
                                <SelectTrigger className="bg-zinc-950 border-zinc-800 text-lg py-6">
                                    <SelectValue placeholder="Selecciona..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="60">60 mins (1 Hora)</SelectItem>
                                    <SelectItem value="90">90 mins (1 hora 30)</SelectItem>
                                    <SelectItem value="120">120 mins (2 Horas)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-zinc-400">
                                💡 Tip: 90 minutos es el estándar global para partidos de 4.
                            </p>
                        </div>

                        {/* CANCELLATION */}
                        <div className="space-y-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-800 transition-colors">
                            <Label className="text-base">Ventana de Cancelación</Label>
                            <Stepper
                                value={formData.cancellation_window || 0}
                                onChange={(v) => handleChange('cancellation_window', v)}
                                min={0}
                                max={72}
                                step={1}
                                suffix=" horas"
                                description="Tiempo mínimo de antelación para cancelar sin penalidad."
                            />
                        </div>

                        {/* HORIZON */}
                        <div className="space-y-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-800 transition-colors">
                            <Label className="text-base">Horizonte de Reserva</Label>
                            <Stepper
                                value={formData.advance_booking_days || 14}
                                onChange={(v) => handleChange('advance_booking_days', v)}
                                min={1}
                                max={365}
                                step={1}
                                suffix=" días"
                                description="Con cuánta antelación pueden reservar los jugadores."
                            />
                        </div>

                        {/* INFO BOX */}
                        <div className="p-4 rounded-xl bg-[#ccff00]/5 border border-[#ccff00]/10 flex gap-3 text-sm">
                            <HelpCircle className="w-5 h-5 text-[#ccff00] shrink-0" />
                            <div className="text-zinc-300 space-y-1">
                                <p className="font-medium text-[#ccff00]">¿Sabías qué?</p>
                                <p>Limitar el horizonte de reserva a 14 días aumenta la urgencia y reduce los "no-shows" a largo plazo.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-6 border-t border-zinc-800">
                        <Button type="submit" disabled={loading} className="bg-[#ccff00] text-black hover:bg-[#b5952f] px-8">
                            <Save className="h-4 w-4 mr-2" />
                            {loading ? 'Guardando...' : 'Aplicar Reglas'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
