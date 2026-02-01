"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Coach } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Pencil, Loader2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

const AVAILABLE_SPECIALTIES = ['Functional', 'Yoga', 'Hyrox', 'Crossfit', 'Pilates']

export default function AdminCoachesPage() {
    const { t } = useLanguage()
    const [coaches, setCoaches] = useState<Coach[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [newCoach, setNewCoach] = useState<{ name: string, specialties: string[] }>({ name: '', specialties: [] })
    const [editingCoachId, setEditingCoachId] = useState<string | null>(null)
    const [editingCoachName, setEditingCoachName] = useState<string>('')

    useEffect(() => {
        fetchCoaches()
    }, [])

    const fetchCoaches = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('coaches').select('*').order('created_at', { ascending: false })
        if (data) setCoaches(data)
        if (error) console.error(error)
        setLoading(false)
    }

    const handleSaveCoach = async (e: React.FormEvent) => {
        e.preventDefault()
        if (newCoach.specialties.length === 0) {
            alert(t.dashboard.coaches.errors.select_specialty)
            return
        }

        setSaving(true)
        try {
            if (editingCoachId) {
                // Update existing coach
                const { error } = await supabase.from('coaches').update({
                    name: newCoach.name,
                    specialties: newCoach.specialties,
                    specialty: newCoach.specialties[0] // Legacy support
                }).eq('id', editingCoachId)

                if (error) throw error

                setEditingCoachId(null)
                setNewCoach({ name: '', specialties: [] })
                setIsModalOpen(false)
                fetchCoaches()
            } else {
                // Add new coach
                const { error } = await supabase.from('coaches').insert({
                    name: newCoach.name,
                    specialties: newCoach.specialties,
                    specialty: newCoach.specialties[0] // Legacy support
                })

                if (error) throw error

                setNewCoach({ name: '', specialties: [] })
                setIsModalOpen(false)
                fetchCoaches()
            }
        } catch (error: any) {
            alert(t.dashboard.coaches.errors.save + error.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteCoach = async (id: string) => {
        if (!confirm(t.dashboard.coaches.errors.delete_confirm)) return
        const { error } = await supabase.from('coaches').delete().eq('id', id)
        if (error) {
            alert(t.dashboard.coaches.errors.delete + error.message)
        } else {
            fetchCoaches()
        }
    }

    const handleEditCoach = (coach: Coach) => {
        setEditingCoachId(coach.id)
        setEditingCoachName(coach.name)
        setNewCoach({
            name: coach.name,
            specialties: coach.specialties || (coach.specialty ? [coach.specialty] : [])
        })
        setIsModalOpen(true)
    }

    const handleOpenAddModal = () => {
        setEditingCoachId(null)
        setNewCoach({ name: '', specialties: [] })
        setIsModalOpen(true)
    }

    const toggleSpecialty = (spec: string) => {
        setNewCoach(prev => {
            if (prev.specialties.includes(spec)) {
                return { ...prev, specialties: prev.specialties.filter(s => s !== spec) }
            } else {
                return { ...prev, specialties: [...prev.specialties, spec] }
            }
        })
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-foreground">{t.dashboard.coaches.title}</h1>
                <Button onClick={handleOpenAddModal}>{t.dashboard.coaches.add_coach}</Button>
            </div>

            <div className="bg-card shadow overflow-hidden sm:rounded-lg ring-1 ring-border">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">{t.dashboard.client.loading}</div>
                ) : coaches.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">{t.dashboard.coaches.no_coaches}</div>
                ) : (
                    <ul className="divide-y divide-border">
                        {coaches.map((coach) => (
                            <li key={coach.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/50">
                                <div>
                                    <h3 className="text-lg font-medium text-foreground">{coach.name}</h3>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {/* Show specialties array, fallback to legacy specialty if array empty/null */}
                                        {coach.specialties && coach.specialties.length > 0 ? (
                                            coach.specialties.map(s => (
                                                <span key={s} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                    {s}
                                                </span>
                                            ))
                                        ) : (
                                            coach.specialty && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                                    {coach.specialty}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => handleEditCoach(coach)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDeleteCoach(coach.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Simple Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                    <div className="bg-card rounded-lg p-6 w-full max-w-md border border-border shadow-xl">
                        <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                            <h3 className="text-lg font-bold text-foreground">{editingCoachId ? t.dashboard.coaches.edit_modal.title_edit : t.dashboard.coaches.edit_modal.title_add}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">X</button>
                        </div>
                        <form onSubmit={handleSaveCoach} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">{t.dashboard.coaches.edit_modal.name}</label>
                                <Input
                                    value={newCoach.name}
                                    onChange={(e) => setNewCoach({ ...newCoach, name: e.target.value })}
                                    required
                                    placeholder="e.g. John Doe"
                                    className="bg-background text-foreground border-input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">{t.dashboard.coaches.edit_modal.specialties}</label>
                                <div className="space-y-2 border border-border rounded-md p-3 max-h-48 overflow-y-auto bg-muted/20">
                                    {AVAILABLE_SPECIALTIES.map((spec) => (
                                        <label key={spec} className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 text-primary focus:ring-primary border-input rounded bg-background"
                                                checked={newCoach.specialties.includes(spec)}
                                                onChange={() => toggleSpecialty(spec)}
                                            />
                                            <span className="text-sm text-foreground">{spec}</span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{t.dashboard.coaches.edit_modal.select_all}</p>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-border mt-4">
                                <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            {t.dashboard.coaches.edit_modal.saving}
                                        </>
                                    ) : (editingCoachId ? t.dashboard.coaches.edit_modal.update_btn : t.dashboard.coaches.edit_modal.save_btn)}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
