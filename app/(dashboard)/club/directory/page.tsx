"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, MoreHorizontal, Phone, Mail, FileText, User, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2 } from "lucide-react"

interface ClubMember {
    id: string
    user_id: string | null // Ensure this is mapped
    full_name: string
    email: string | null
    phone: string | null
    role: string | null
    status: string | null
    total_spent: number
    last_interaction_at: string | null
    notes: string | null
    metadata: any
}

export default function DirectoryPage() {
    const { profile } = useAuth()
    const [members, setMembers] = useState<ClubMember[]>([])
    const [debtors, setDebtors] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<string | 'all'>('all')

    useEffect(() => {
        if (profile?.organization_id) {
            fetchMembers()
        }
    }, [profile?.organization_id])

    const fetchMembers = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('club_members')
                .select('*')
                .eq('entity_id', profile?.organization_id)
                .order('last_interaction_at', { ascending: false, nullsFirst: false })

            // Fetch Debtors (Users with pending bookings)
            const { data: pendingData } = await supabase
                .from('bookings')
                .select('user_id')
                .eq('entity_id', profile?.organization_id)
                .eq('payment_status', 'pending')

            const debtorSet = new Set(pendingData?.map((b: any) => b.user_id).filter(Boolean))
            setDebtors(debtorSet)

            if (error) throw error
            setMembers(data || [])
        } catch (error) {
            console.error("Error fetching directory:", error)
        } finally {
            setLoading(false)
        }
    }

    // Filter Logic
    const filteredMembers = members.filter(member => {
        const matchesSearch =
            member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.phone?.includes(searchQuery)

        const matchesFilter = filterStatus === 'all'
            ? true
            : filterStatus === 'fixed'
                ? (member.metadata?.is_fixed || member.role === 'fixed')
                : filterStatus === 'debtor'
                    ? debtors.has(member.user_id!)
                    : member.status === filterStatus

        return matchesSearch && matchesFilter
    })

    const handleWhatsApp = (phone: string | null, name: string) => {
        if (!phone) return
        let p = phone.replace(/\D/g, '')
        // Simple heuristic for Venezuela if needed, or generic
        if (p.startsWith('0')) p = '58' + p.substring(1)
        if (!p.startsWith('58') && p.length === 10) p = '58' + p

        const msg = `Hola ${name}, te escribimos desde PadelFlow.`
        window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount)
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-[#ccff00]" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Directorio</h1>
                    <p className="text-zinc-400">
                        Gestión centralizada de tus {members.length} socios y clientes.
                    </p>
                </div>
                {/* Actions */}
                <div className="flex gap-2">
                    <Button className="bg-[#ccff00] text-black hover:bg-[#b3e600] font-medium">
                        <User className="mr-2 h-4 w-4" />
                        Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Buscar por nombre, teléfono o email..."
                        className="pl-9 bg-zinc-950 border-zinc-700 focus-visible:ring-[#ccff00]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
                                <Filter className="mr-2 h-4 w-4" />
                                {filterStatus === 'all' ? 'Todos los Estados' : filterStatus === 'fixed' ? 'Socios Fijos' : filterStatus}
                                <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                            <DropdownMenuItem onClick={() => setFilterStatus('all')}>Todos</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterStatus('active')}>Activos</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterStatus('fixed')}>Socios Fijos</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterStatus('debtor')} className="text-red-400 focus:text-red-400">Deudores</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilterStatus('inactive')}>Inactivos</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">
                        Exportar CSV
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30 backdrop-blur-md">
                <Table>
                    <TableHeader className="bg-zinc-900/80">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Socio / Cliente</TableHead>
                            <TableHead className="text-zinc-400">Contacto</TableHead>
                            <TableHead className="text-zinc-400">Estado</TableHead>
                            <TableHead className="text-zinc-400 text-right">LTV (Total)</TableHead>
                            <TableHead className="text-zinc-400 text-right">Última Interacción</TableHead>
                            <TableHead className="text-zinc-400 text-center">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMembers.length > 0 ? (
                            filteredMembers.map((member) => (
                                <TableRow key={member.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors group">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-zinc-700">
                                                <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs font-medium">
                                                    {member.full_name?.substring(0, 2).toUpperCase() || "??"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">{member.full_name}</span>
                                                {member.notes && (
                                                    <span className="text-[10px] text-zinc-500 truncate max-w-[150px]" title={member.notes}>
                                                        Note: {member.notes}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {member.email && (
                                                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                                    <Mail className="h-3 w-3" />
                                                    <span className="truncate max-w-[140px]">{member.email}</span>
                                                </div>
                                            )}
                                            {member.phone && (
                                                <div
                                                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#ccff00] cursor-pointer transition-colors w-fit"
                                                    onClick={() => handleWhatsApp(member.phone, member.full_name)}
                                                >
                                                    <Phone className="h-3 w-3" />
                                                    <span>{member.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {/* Status Badge */}
                                            <Badge
                                                variant="outline"
                                                className={
                                                    member.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                        member.status === 'inactive' ? "bg-zinc-800 text-zinc-500 border-zinc-700" :
                                                            "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                }
                                            >
                                                {member.status === 'active' ? 'Activo' : member.status === 'inactive' ? 'Inactivo' : 'Regular'}
                                            </Badge>

                                            {/* Fixed Member Badge */}
                                            {(member.metadata?.is_fixed || member.role === 'fixed') && (
                                                <Badge variant="secondary" className="text-[10px] h-5 bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    Fijo
                                                </Badge>
                                            )}

                                            {/* VIP Badge (LTV > 300) */}
                                            {member.total_spent > 300 && (
                                                <Badge variant="secondary" className="text-[10px] h-5 bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    VIP
                                                </Badge>
                                            )}

                                            {/* Debtor Badge */}
                                            {member.user_id && debtors.has(member.user_id) && (
                                                <Badge variant="secondary" className="text-[10px] h-5 bg-red-500/10 text-red-500 border border-red-500/20">
                                                    Deudor
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="font-medium text-white">{formatCurrency(member.total_spent || 0)}</div>
                                        <div className="text-[10px] text-zinc-500">{member.metadata?.total_bookings || 0} reservas</div>
                                    </TableCell>
                                    <TableCell className="text-right text-zinc-400 text-sm">
                                        {member.last_interaction_at
                                            ? format(new Date(member.last_interaction_at), "d MMM yyyy", { locale: es })
                                            : "N/A"
                                        }
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                                                <DropdownMenuItem>Editar Notas</DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-zinc-800" />
                                                <DropdownMenuItem className="text-red-500 focus:text-red-500">Bloquear</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                                    No se encontraron resultados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-zinc-500 text-center">
                Mostrando {filteredMembers.length} de {members.length} registros.
            </div>
        </div>
    )
}
