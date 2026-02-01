"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useLanguage } from "@/context/LanguageContext"

interface FinancialRecordsTableProps {
    records: any[]
    onUpdate: () => void
    onEdit?: (record: any) => void
}

export function FinancialRecordsTable({ records, onUpdate, onEdit }: FinancialRecordsTableProps) {
    const { t } = useLanguage()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const filteredRecords = records.filter(record => {
        const term = searchTerm.toLowerCase()
        const matchesSearch = (
            (record.description || '').toLowerCase().includes(term) ||
            (record.category || '').toLowerCase().includes(term) ||
            record.amount.toString().includes(term)
        )
        const matchesType = typeFilter === 'all' || record.type === typeFilter

        let matchesDate = true
        if (startDate) matchesDate = matchesDate && new Date(record.date) >= new Date(startDate)
        if (endDate) {
            const end = new Date(endDate)
            end.setDate(end.getDate() + 1)
            matchesDate = matchesDate && new Date(record.date) < end
        }

        return matchesSearch && matchesType && matchesDate
    })

    const handleDelete = async (id: string) => {
        const confirmMsg = (t.dashboard.admin as any)?.confirm_delete || "¿Estás seguro de que quieres eliminar este registro?"
        if (!confirm(confirmMsg)) return

        setDeletingId(id)
        try {
            const { error } = await supabase
                .from('financial_records')
                .delete()
                .eq('id', id)

            if (error) throw error
            onUpdate()
        } catch (error) {
            console.error("Error deleting record:", error)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-span-1">
                    <label className="text-sm font-medium mb-1 block">{(t.dashboard.admin as any)?.search || "Buscar"}</label>
                    <Input
                        placeholder={(t.dashboard.admin as any)?.search_placeholder || "Desc, Category..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="col-span-1">
                    <label className="text-sm font-medium mb-1 block">{(t.dashboard.admin as any)?.type || "Tipo"}</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger><SelectValue placeholder={(t.dashboard.admin as any)?.all || "Todos"} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{(t.dashboard.admin as any)?.all || "Todos"}</SelectItem>
                            <SelectItem value="income">{(t.dashboard.admin as any)?.income || "Ingreso"}</SelectItem>
                            <SelectItem value="expense">{(t.dashboard.admin as any)?.expense || "Gasto"}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-1">
                    <label className="text-sm font-medium mb-1 block">{(t.dashboard.admin as any)?.from_date || "Desde"}</label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="col-span-1">
                    <label className="text-sm font-medium mb-1 block">{(t.dashboard.admin as any)?.to_date || "Hasta"}</label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
            </div>

            <div className="rounded-md border border-border">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border hover:bg-muted/50">
                                <TableHead className="text-muted-foreground">{(t.dashboard.admin as any)?.date || "Fecha"}</TableHead>
                                <TableHead className="text-muted-foreground">{(t.dashboard.admin as any)?.description || "Descripción"}</TableHead>
                                <TableHead className="text-muted-foreground">{(t.dashboard.admin as any)?.category || "Categoría"}</TableHead>
                                <TableHead className="text-muted-foreground">{(t.dashboard.admin as any)?.type || "Tipo"}</TableHead>
                                <TableHead className="text-right text-muted-foreground">{(t.dashboard.admin as any)?.amount || "Monto"}</TableHead>
                                <TableHead className="text-right text-muted-foreground">{(t.dashboard.admin as any)?.actions || "Acciones"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRecords.map((record) => (
                                <TableRow key={record.id} className="border-border hover:bg-muted/50">
                                    <TableCell className="text-foreground">
                                        {format(new Date(record.date), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-foreground">{record.description || '-'}</TableCell>
                                    <TableCell className="text-foreground">{record.category}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.type === 'income'
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-red-500/10 text-red-500'
                                            }`}>
                                            {record.type === 'income' ? ((t.dashboard.admin as any)?.income || 'Ingreso') : ((t.dashboard.admin as any)?.expense || 'Gasto')}
                                        </span>
                                    </TableCell>
                                    <TableCell className={`text-right font-medium ${record.type === 'income' ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                        {record.type === 'income' ? '+' : '-'} ${Number(record.amount).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit?.(record)}
                                        >
                                            <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={deletingId === record.id}
                                            onClick={() => handleDelete(record.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-border rounded-md overflow-hidden">
                    {filteredRecords.map((record) => (
                        <div key={record.id} className="p-4 space-y-3 bg-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-foreground">{record.description || ((t.dashboard.admin as any)?.no_description || 'Sin descripción')}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(record.date), 'MMM d, yyyy')}</p>
                                </div>
                                <span className={`text-sm font-bold ${record.type === 'income' ? 'text-green-500' : 'text-red-500'
                                    }`}>
                                    {record.type === 'income' ? '+' : '-'} ${Number(record.amount).toLocaleString()}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${record.type === 'income'
                                        ? 'bg-green-500/10 text-green-500'
                                        : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        {record.type === 'income' ? ((t.dashboard.admin as any)?.income || 'Ingreso') : ((t.dashboard.admin as any)?.expense || 'Gasto')}
                                    </span>
                                    <span className="px-2 py-1 rounded-full text-xs bg-muted text-foreground">
                                        {record.category}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => onEdit?.(record)}
                                    >
                                        <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        disabled={deletingId === record.id}
                                        onClick={() => handleDelete(record.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredRecords.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        {(t.dashboard.admin as any)?.no_records || "No se encontraron registros"}
                    </div>
                )}
            </div>
        </div>
    )
}
