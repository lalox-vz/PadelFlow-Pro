"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronsUpDown, Search, User, UserPlus, Phone } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { searchClubMembers, MemberResult } from "@/app/actions/crm"
import { Badge } from "@/components/ui/badge"

interface MemberSelectorProps {
    onSelect: (member: { id: string | null; name: string }) => void
    initialName?: string
}

export function MemberSelector({ onSelect, initialName = "" }: MemberSelectorProps) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState(initialName)
    const [members, setMembers] = useState<MemberResult[]>([])
    const [loading, setLoading] = useState(false)
    const [debouncedValue, setDebouncedValue] = useState(initialName)
    const containerRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Debounce input for search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(inputValue)
        }, 300)
        return () => clearTimeout(handler)
    }, [inputValue])

    // Search members when debounced value changes
    useEffect(() => {
        const runSearch = async () => {
            if (!debouncedValue || debouncedValue.length < 2) {
                setMembers([])
                return
            }

            setLoading(true)
            try {
                // Use Server Action
                const results = await searchClubMembers(debouncedValue)
                setMembers(results)
            } catch (err) {
                console.error("Search failed:", err)
            } finally {
                setLoading(false)
            }
        }

        if (open) {
            runSearch()
        }
    }, [debouncedValue, open])

    const handleSelectMember = (member: MemberResult) => {
        setInputValue(member.full_name)
        // Critical: If they have a user_id, link it! otherwise standard manual booking
        onSelect({ id: member.user_id, name: member.full_name })
        setOpen(false)
    }

    const handleManualEntry = () => {
        onSelect({ id: null, name: inputValue })
        setOpen(false)
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative">
                <Input
                    placeholder="Buscar socio, teléfono o nombre..."
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setOpen(true)
                        // Sync manual entry immediately if needed, or wait for selection
                        // For now we assume selection is final action, but we update parent loosely
                        onSelect({ id: null, name: e.target.value })
                    }}
                    onFocus={() => setOpen(true)}
                    className="pr-10 bg-zinc-900 border-zinc-700 focus:border-emerald-500 focus:ring-emerald-500/20"
                />

                <div className="absolute right-3 top-2.5 text-zinc-500">
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                </div>
            </div>

            {open && inputValue.length > 1 && (
                <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-md shadow-xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <div className="p-1">
                        {/* Results List */}
                        {members.length > 0 && (
                            <div className="mb-1">
                                <p className="text-[10px] uppercase text-zinc-500 px-2 py-1 font-semibold flex justify-between">
                                    <span>Resultados</span>
                                    <span className="text-emerald-600">{members.length} encontrados</span>
                                </p>
                                {members.map((member) => (
                                    <button
                                        key={member.id}
                                        onClick={() => handleSelectMember(member)}
                                        className="w-full text-left px-2 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded flex items-center gap-3 group transition-colors"
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center text-xs border",
                                            member.source === 'App'
                                                ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                                                : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                        )}>
                                            {member.full_name.substring(0, 2).toUpperCase()}
                                        </div>

                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                                                    {member.full_name}
                                                </span>
                                                {member.source === 'App' && (
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-900 text-blue-400">
                                                        APP
                                                    </Badge>
                                                )}
                                                {member.source === 'Club' && (
                                                    <Badge variant="outline" className="text-[9px] h-4 px-1 border-zinc-700 text-zinc-500">
                                                        CLUB
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                {member.phone && (
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {member.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Manual Option */}
                        <button
                            onClick={handleManualEntry}
                            className="w-full text-left px-2 py-3 text-sm text-zinc-300 hover:bg-emerald-950/30 hover:text-emerald-400 rounded flex items-center gap-3 border-t border-zinc-800 mt-1"
                        >
                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <UserPlus className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">Usar "{inputValue}"</span>
                                <span className="text-[10px] text-zinc-500">Crear reserva manual (Sin vincular)</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
