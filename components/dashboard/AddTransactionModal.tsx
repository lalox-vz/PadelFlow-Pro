"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

interface AddTransactionModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    record?: any
}

const CATEGORIES = [
    "Alquiler",
    "Salario Entrenador",
    "Equipamiento",
    "Mantenimiento",
    "Marketing",
    "Consultoría",
    "Servicios",
    "Otro"
]

export function AddTransactionModal({ isOpen, onClose, onSuccess, record }: AddTransactionModalProps) {
    const [loading, setLoading] = useState(false)
    const [currency, setCurrency] = useState<'USD' | 'Bs'>('USD')
    const [tasa, setTasa] = useState('400')
    const [formData, setFormData] = useState({
        type: 'expense',
        amount: '', // This will hold the input value (either USD or Bs depending on currency)
        category: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    })

    // Fetch rate
    useEffect(() => {
        if (isOpen) {
            const fetchRate = async () => {
                const { data } = await supabase
                    .from('app_settings')
                    .select('value')
                    .eq('key', 'exchange_rate')
                    .single()
                if (data?.value) setTasa(String(data.value))
            }
            fetchRate()
        }
    }, [isOpen])

    // Reset or populate form
    const [lastRecordId, setLastRecordId] = useState<string | null>(null)
    if (isOpen && record && record.id !== lastRecordId) {
        setFormData({
            type: record.type,
            amount: record.amount, // stored in USD
            category: record.category,
            date: record.date,
            description: record.description || ''
        })
        setCurrency('USD') // Edit always starts in USD (base currency)
        setLastRecordId(record.id)
    } else if (isOpen && !record && lastRecordId !== null) {
        setFormData({
            type: 'expense',
            amount: '',
            category: '',
            date: new Date().toISOString().split('T')[0],
            description: ''
        })
        setCurrency('USD')
        setLastRecordId(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let finalAmount = parseFloat(formData.amount)

            // Convert if Bs
            if (currency === 'Bs') {
                if (!tasa || parseFloat(tasa) === 0) throw new Error("Tasa inválida")
                finalAmount = finalAmount / parseFloat(tasa)
            }

            const payload = {
                type: formData.type,
                amount: finalAmount, // Always save USD
                category: formData.category || 'Otro',
                description: formData.description,
                date: formData.date
            }

            let error;
            if (record?.id) {
                const { error: updateError } = await supabase
                    .from('financial_records')
                    .update(payload)
                    .eq('id', record.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('financial_records')
                    .insert([payload])
                error = insertError
            }

            if (error) throw error

            onSuccess()
            onClose()
            if (!record) {
                setFormData({
                    type: 'expense',
                    amount: '',
                    category: '',
                    date: new Date().toISOString().split('T')[0],
                    description: ''
                })
                setCurrency('USD')
            }
        } catch (error) {
            console.error("Error saving transaction:", error)
            alert("Error al guardar el movimiento")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="fixed z-50 w-full h-full max-w-none m-0 rounded-none border-none overflow-y-auto left-0 top-0 translate-x-0 translate-y-0 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:h-auto sm:max-w-[425px] p-6">
                <DialogHeader>
                    <DialogTitle>Registrar Movimiento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* Type Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-sm font-medium">Tipo</label>
                        <div className="col-span-1 sm:col-span-3 flex gap-2">
                            <Button
                                type="button"
                                variant={formData.type === 'income' ? 'default' : 'outline'}
                                className={formData.type === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                                onClick={() => setFormData({ ...formData, type: 'income' })}
                            >
                                Ingreso
                            </Button>
                            <Button
                                type="button"
                                variant={formData.type === 'expense' ? 'default' : 'outline'}
                                className={formData.type === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
                                onClick={() => setFormData({ ...formData, type: 'expense' })}
                            >
                                Gasto
                            </Button>
                        </div>
                    </div>

                    {/* Currency Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-sm font-medium">Moneda</label>
                        <div className="col-span-1 sm:col-span-3 flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant={currency === 'USD' ? 'default' : 'secondary'}
                                onClick={() => setCurrency('USD')}
                            >
                                USD ($)
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={currency === 'Bs' ? 'default' : 'secondary'}
                                onClick={() => setCurrency('Bs')}
                            >
                                Bolívares (Bs)
                            </Button>
                        </div>
                    </div>

                    {/* Amount & Tasa */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                        <label htmlFor="amount" className="text-left sm:text-right text-sm font-medium mt-0 sm:mt-2">
                            Monto ({currency})
                        </label>
                        <div className="col-span-1 sm:col-span-3 space-y-2">
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                            {currency === 'Bs' && (
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                                    <span className="whitespace-nowrap">Tasa:</span>
                                    <Input
                                        type="number"
                                        value={tasa}
                                        onChange={e => setTasa(e.target.value)}
                                        className="h-8 w-24"
                                    />
                                    <span className="text-gray-500 whitespace-nowrap ml-auto">
                                        = ${(parseFloat(formData.amount || '0') / (parseFloat(tasa) || 1)).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                        <label htmlFor="category" className="text-left sm:text-right text-sm font-medium">
                            Categoría
                        </label>
                        <div className="col-span-1 sm:col-span-3">
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                        <label htmlFor="date" className="text-left sm:text-right text-sm font-medium">
                            Fecha
                        </label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="col-span-1 sm:col-span-3"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                        <label htmlFor="description" className="text-left sm:text-right text-sm font-medium">
                            Descripción
                        </label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="col-span-1 sm:col-span-3"
                            placeholder="Detalles opcionales"
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Guardando..." : "Guardar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
