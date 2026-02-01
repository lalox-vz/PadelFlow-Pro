"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronsUpDown, Search, User, UserPlus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface MemberSelectorProps {
    onSelect: (member: { id: string | null; name: string }) => void
    initialName?: string
}

export function MemberSelector({ onSelect, initialName = "" }: MemberSelectorProps) { // No need for initialName if it's new booking usually, but good for edits
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState(initialName)
    const [users, setUsers] = useState<{ id: string; full_name: string; email: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [debouncedValue, setDebouncedValue] = useState(initialName)

    // Debounce input for search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(inputValue)
        }, 300)
        return () => clearTimeout(handler)
    }, [inputValue])

    // Search users when debounced value changes
    useEffect(() => {
        const searchUsers = async () => {
            if (!debouncedValue || debouncedValue.length < 2) {
                setUsers([])
                return
            }

            setLoading(true)
            try {
                // Search by name or email
                const { data, error } = await supabase
                    .from('users')
                    .select('id, full_name, email')
                    .or(`full_name.ilike.%${debouncedValue}%,email.ilike.%${debouncedValue}%`)
                    .limit(5)

                if (error) {
                    console.error("Error searching users:", error)
                } else {
                    setUsers(data || [])
                }
            } catch (err) {
                console.error("Search failed:", err)
            } finally {
                setLoading(false)
            }
        }

        if (open) { // Only search if the dropdown is roughly "active" or intended? 
            // Actually better to always search if typing? 
            // Let's rely on the Popover being open logic.
            // But if I type in the Input, I want it to open.
            searchUsers()
        }
    }, [debouncedValue, open])

    const handleSelectUser = (user: { id: string; full_name: string }) => {
        setInputValue(user.full_name)
        onSelect({ id: user.id, name: user.full_name })
        setOpen(false)
    }

    const handleManualEntry = () => {
        onSelect({ id: null, name: inputValue })
        setOpen(false)
    }

    return (
        <div className="relative w-full">
            <div className="relative">
                <Input
                    placeholder="Buscar socio o escribir nombre..."
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setOpen(true)
                        // Also update parent immediately as manual entry in case they don't select anything?
                        // Better to wait for explicit select or blur? 
                        // Let's update parent with 'manual' on every change effectively?
                        // No, let's keep the parent state in sync with just the text for now?
                        // The prompt asked for a dropdown.
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
                <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-md shadow-xl overflow-hidden">
                    <div className="p-1">
                        {/* Results List */}
                        {users.length > 0 && (
                            <div className="mb-1">
                                <p className="text-[10px] uppercase text-zinc-500 px-2 py-1 font-semibold">Socios Registrados</p>
                                {users.map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full text-left px-2 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded flex items-center gap-2"
                                    >
                                        <div className="h-6 w-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs border border-blue-500/30">
                                            {user.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white">{user.full_name}</span>
                                            <span className="text-[10px] text-zinc-500">{user.email}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Manual Option */}
                        <button
                            onClick={handleManualEntry}
                            className="w-full text-left px-2 py-2 text-sm text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 rounded flex items-center gap-2 border-t border-zinc-800 pt-2"
                        >
                            <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                <UserPlus className="h-3 w-3" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium">Usar "{inputValue}"</span>
                                <span className="text-[10px] text-zinc-500">Cliente casual (Sin cuenta)</span>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Backdrop to close */}
            {open && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpen(false)} />
            )}
        </div>
    )
}
