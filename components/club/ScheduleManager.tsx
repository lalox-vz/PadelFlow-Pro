"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { Loader2, Copy, Save, Clock, Check } from "lucide-react"

const DAYS = [
    { id: 1, label: 'Lunes' },
    { id: 2, label: 'Martes' },
    { id: 3, label: 'Miércoles' },
    { id: 4, label: 'Jueves' },
    { id: 5, label: 'Viernes' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
]

interface ScheduleDay {
    day_of_week: number
    open_time: string
    close_time: string
    is_active: boolean
}

interface ScheduleManagerProps {
    entityId: string
}

export function ScheduleManager({ entityId }: ScheduleManagerProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [schedule, setSchedule] = useState<ScheduleDay[]>([])
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        loadSchedule()
    }, [entityId])

    const loadSchedule = async () => {
        try {
            const { data, error } = await supabase
                .from('opening_hours')
                .select('*')
                .eq('entity_id', entityId)

            if (error) throw error

            const fullSchedule = DAYS.map(d => {
                const existing = data?.find(h => h.day_of_week === d.id)
                return {
                    day_of_week: d.id,
                    open_time: existing ? existing.open_time.substring(0, 5) : '07:00',
                    close_time: existing ? existing.close_time.substring(0, 5) : '23:00',
                    is_active: !!existing
                }
            })
            setSchedule(fullSchedule)
        } catch (error) {
            console.error(error)
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los horarios" })
        } finally {
            setLoading(false)
        }
    }

    const updateDay = (dayId: number, field: keyof ScheduleDay, value: any) => {
        setSchedule(prev => prev.map(d => d.day_of_week === dayId ? { ...d, [field]: value } : d))
    }

    const copyMondayToAll = () => {
        const monday = schedule.find(d => d.day_of_week === 1)
        if (!monday) return

        if (confirm("¿Copiar horario del Lunes a toda la semana?")) {
            setSchedule(prev => prev.map(d =>
                d.day_of_week === 1 ? d : {
                    ...d,
                    open_time: monday.open_time,
                    close_time: monday.close_time,
                    is_active: monday.is_active
                }
            ))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
            toast({ title: "Copiado", description: "Horario unificado correctamente." })
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error: delError } = await supabase
                .from('opening_hours')
                .delete()
                .eq('entity_id', entityId)

            if (delError) throw delError

            const toInsert = schedule
                .filter(d => d.is_active)
                .map(d => ({
                    entity_id: entityId,
                    day_of_week: d.day_of_week,
                    open_time: d.open_time,
                    close_time: d.close_time
                }))

            if (toInsert.length > 0) {
                const { error: insError } = await supabase
                    .from('opening_hours')
                    .insert(toInsert)

                if (insError) throw insError
            }

            toast({ title: "Horarios Guardados", description: "Disponibilidad actualizada." })

        } catch (error: any) {
            console.error(error)
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setSaving(false)
        }
    }

    const getTimelineStyle = (open: string, close: string) => {
        const toMinutes = (time: string) => {
            const [h, m] = time.split(':').map(Number)
            return h * 60 + m
        }
        const start = toMinutes(open)
        const end = toMinutes(close)
        const total = 1440 // 24 * 60

        const left = (start / total) * 100
        const width = ((end - start) / total) * 100

        return { left: `${left}%`, width: `${width}%` }
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

    if (loading) return <div className="p-4"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-3 text-sm text-zinc-400">
                    <div className="p-2 bg-zinc-800 rounded-full">
                        <Clock className="w-4 h-4 text-[#ccff00]" />
                    </div>
                    <span>Días activos se mostrarán en la app. Días inactivos bloquean reservas.</span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={copyMondayToAll}
                    className={`h-9 border-zinc-700 hover:bg-zinc-800 transition-all ${copied ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : ''}`}
                >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? '¡Copiado!' : 'Copiar Lunes a Todos'}
                </Button>
            </div>

            <div className="space-y-3">
                {schedule.sort((a, b) => {
                    const adjust = (n: number) => n === 0 ? 7 : n
                    return adjust(a.day_of_week) - adjust(b.day_of_week)
                }).map((day) => (
                    <div key={day.day_of_week} className="group flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 transition-all hover:bg-zinc-900 hover:border-zinc-700">
                        {/* CONTROLS */}
                        <div className="flex items-center gap-4 w-48 shrink-0">
                            <Switch
                                checked={day.is_active}
                                onCheckedChange={(c) => updateDay(day.day_of_week, 'is_active', c)}
                                className="data-[state=checked]:bg-[#ccff00]"
                            />
                            <span className={`font-medium w-20 ${day.is_active ? 'text-white' : 'text-zinc-600'}`}>
                                {DAYS.find(d => d.id === day.day_of_week)?.label}
                            </span>
                        </div>

                        {/* TIMELINE VISUALIZER */}
                        <div className="flex-1 flex flex-col justify-center h-full min-h-[40px] relative px-2">
                            {/* Background Track */}
                            <div className="w-full h-2 bg-zinc-800/50 rounded-full overflow-hidden relative">
                                {/* Hour Markers (0, 6, 12, 18, 24) */}
                                {[0, 6, 12, 18].map(h => (
                                    <div key={h} className="absolute top-0 bottom-0 w-[1px] bg-zinc-700" style={{ left: `${(h / 24) * 100}%` }} />
                                ))}

                                {/* Active Bar */}
                                {day.is_active && (
                                    <div
                                        className="absolute top-0 bottom-0 bg-gradient-to-r from-[#ccff00] to-[#b5952f] rounded-full opacity-80"
                                        style={getTimelineStyle(day.open_time, day.close_time)}
                                    />
                                )}
                            </div>

                            {/* Labels under track */}
                            <div className="flex justify-between text-[10px] text-zinc-600 mt-1 px-0.5">
                                <span>00:00</span>
                                <span>12:00</span>
                                <span>24:00</span>
                            </div>
                        </div>

                        {/* INPUTS */}
                        {day.is_active ? (
                            <div className="flex items-center gap-2 shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
                                <select
                                    className="h-9 w-24 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ccff00]"
                                    value={day.open_time}
                                    onChange={(e) => updateDay(day.day_of_week, 'open_time', e.target.value)}
                                >
                                    {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <span className="text-zinc-600">→</span>
                                <select
                                    className="h-9 w-24 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ccff00]"
                                    value={day.close_time}
                                    onChange={(e) => updateDay(day.day_of_week, 'close_time', e.target.value)}
                                >
                                    {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="w-[240px] text-right text-zinc-600 italic text-sm pr-4">
                                Cerrado
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800">
                <Button onClick={handleSave} disabled={saving} className="bg-[#ccff00] text-black hover:bg-[#b5952f] px-8">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Guardar Horarios
                </Button>
            </div>
        </div>
    )
}
