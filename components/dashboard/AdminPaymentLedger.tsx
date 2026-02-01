"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useLanguage } from "@/context/LanguageContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format, isValid } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Payment } from "@/types"
import { Loader2 } from "lucide-react"

interface ExtendedPayment extends Payment {
    user?: {
        full_name: string | null
        email: string | null
        membership_tier?: string | null
    }
    plan_type?: string | null
}

interface Filters {
    search: string
    status: 'all' | 'pending' | 'approved' | 'rejected'
    method: 'all' | 'Cash' | 'Zelle' | 'PagoMovil' | 'Facebank'
    startDate: string
    endDate: string
}

export default function AdminPaymentLedger() {
    const { t, language } = useLanguage()
    const locale = language === 'es' ? es : enUS

    const [payments, setPayments] = useState<ExtendedPayment[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPayment, setSelectedPayment] = useState<ExtendedPayment | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [updating, setUpdating] = useState<'approved' | 'rejected' | null>(null)
    const [selectedTier, setSelectedTier] = useState<'VIP' | 'Access' | 'Basic' | 'Not a Member'>('Access')
    const [denyReason, setDenyReason] = useState('')
    const [isDenyMode, setIsDenyMode] = useState(false)

    // Filters State
    const [filters, setFilters] = useState<Filters>({
        search: '',
        status: 'all',
        method: 'all',
        startDate: '',
        endDate: ''
    })

    useEffect(() => {
        fetchPayments()
    }, [])

    const fetchPayments = async () => {
        const { data, error } = await supabase
            .from('payments')
            .select('*, user:users(full_name, email, membership_tier)')
            .order('created_at', { ascending: false }) // eslint-disable-line @typescript-eslint/no-explicit-any


        if (error) {
            console.error("Error fetching payments:", error)
        } else {
            setPayments((data || []) as ExtendedPayment[])
        }

        setLoading(false)
    }

    const handlePaymentClick = (payment: ExtendedPayment) => {
        setSelectedPayment(payment)
        setIsDialogOpen(true)
        setIsDenyMode(false)
        setDenyReason('')

        // Auto-select tier based on plan_type
        if (payment.plan_type) {
            const upper = payment.plan_type.toUpperCase()
            if (upper.includes('VIP')) setSelectedTier('VIP')
            else if (upper.includes('ACCESS') || upper.includes('ACCESO')) setSelectedTier('Access')
            else if (upper.includes('BASIC')) setSelectedTier('Basic')
            else setSelectedTier('Access')
        } else {
            // Default fallback if no plan_type
            setSelectedTier('Access')
        }
    }

    const handleAction = async (action: 'approved' | 'rejected') => {
        if (!selectedPayment) return

        if (action === 'rejected') {
            if (!isDenyMode) {
                setIsDenyMode(true)
                return
            }
            if (!denyReason.trim()) {
                alert(t.dashboard.admin.payment_modal.deny_reason_placeholder)
                return
            }
        }

        setUpdating(action)

        try {
            // 1. Update Payment Status
            const updatePayload: any = { status: action }
            if (action === 'rejected') updatePayload.denial_reason = denyReason

            const { error: paymentError } = await supabase
                .from('payments')
                .update(updatePayload)
                .eq('id', selectedPayment.id)

            if (paymentError) throw paymentError

            let notificationMessage = `Tu pago de $${selectedPayment.amount} ha sido ${action === 'approved' ? 'aprobado' : 'rechazado'}.`

            // 2. If approved, update user membership
            if (action === 'approved') {
                const expiresAt = new Date()
                expiresAt.setMonth(expiresAt.getMonth() + 1) // Add 1 month by default

                const { error: userError } = await supabase
                    .from('users')
                    .update({
                        membership_tier: selectedTier,
                        membership_expires_at: expiresAt.toISOString()
                    })
                    .eq('id', selectedPayment.user_id)

                if (userError) throw userError

                notificationMessage = `¡Tu pago de $${selectedPayment.amount} ha sido APROBADO! Ahora eres miembro ${selectedTier}.`
            } else {
                notificationMessage = `Tu pago de $${selectedPayment.amount} ha sido RECHAZADO.`
            }

            // 3. Notification (Insert into notifications table)
            if (selectedPayment.user_id) {
                await supabase.from('notifications').insert({
                    user_id: selectedPayment.user_id,
                    message: notificationMessage,
                    type: 'payment_update',
                    read: false
                })
            }

            alert(`¡Pago ${action === 'approved' ? 'aprobado' : 'rechazado'}!`)
            setIsDialogOpen(false)
            fetchPayments()

        } catch (error) {
            alert("Error: " + (error as Error).message)
        } finally {
            setUpdating(null)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return isValid(date) ? format(date, 'PP', { locale }) : 'Invalid Date'
    }

    const formatDateFull = (dateString: string) => {
        const date = new Date(dateString)
        return isValid(date) ? format(date, 'PPP', { locale }) : 'Invalid Date'
    }

    // Filter Logic
    const filteredPayments = payments.filter(payment => {
        // Search by Name/Email OR Invoice Number
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
            (payment.user?.full_name || '').toLowerCase().includes(searchTerm) ||
            (payment.user?.email || '').toLowerCase().includes(searchTerm) ||
            (payment.invoice_number || '').toLowerCase().includes(searchTerm)

        // Filter by Status
        const matchesStatus = filters.status === 'all' || payment.status === filters.status

        // Filter by Method
        const matchesMethod = filters.method === 'all' || payment.method === filters.method

        // Filter by Date Range
        let matchesDate = true
        if (filters.startDate) {
            matchesDate = matchesDate && new Date(payment.created_at) >= new Date(filters.startDate)
        }
        if (filters.endDate) {
            // Add 1 day to include the end date fully
            const end = new Date(filters.endDate)
            end.setDate(end.getDate() + 1)
            matchesDate = matchesDate && new Date(payment.created_at) < end
        }

        return matchesSearch && matchesStatus && matchesMethod && matchesDate
    })

    return (
        <Card className="mt-8">
            <CardHeader>
                <CardTitle>{language === 'es' ? 'Libro de Pagos' : 'Payment Ledger'}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search by Name */}
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block">Buscar</label>
                        <Input
                            placeholder="Nombre, Correo o # Factura..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>

                    {/* Filter by Status */}
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block">Estado</label>
                        <Select
                            value={filters.status}
                            onValueChange={(val) => setFilters(prev => ({ ...prev, status: val as Filters['status'] }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todos los Estados" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="approved">Aprobado</SelectItem>
                                <SelectItem value="rejected">Rechazado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter by Method */}
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block">Método</label>
                        <Select
                            value={filters.method}
                            onValueChange={(val) => setFilters(prev => ({ ...prev, method: val as Filters['method'] }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todos los Métodos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Zelle">Zelle</SelectItem>
                                <SelectItem value="PagoMovil">Pago Móvil</SelectItem>
                                <SelectItem value="Facebank">Facebank</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range Start */}
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block">Desde</label>
                        <Input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                    </div>

                    {/* Date Range End */}
                    <div className="col-span-1">
                        <label className="text-sm font-medium mb-1 block">Hasta</label>
                        <Input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="mb-4 text-sm text-gray-500">
                    Mostrando {filteredPayments.length} resultados
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t.dashboard.users.invoice.number}</TableHead>
                            <TableHead>{t.dashboard.users.table.name}</TableHead>
                            <TableHead>{t.dashboard.payments.form.amount}</TableHead>
                            <TableHead>{t.dashboard.payments.form.method}</TableHead>
                            <TableHead>{t.dashboard.users.table.status}</TableHead>
                            <TableHead>{t.dashboard.payments.form.date}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                                        Cargando pagos...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                                    No se encontraron pagos con estos filtros.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPayments.map((payment) => (
                                <TableRow
                                    key={payment.id}
                                    onClick={() => handlePaymentClick(payment)}
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    <TableCell className="font-mono text-xs text-gray-500">
                                        {payment.invoice_number || '-'}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {payment.user?.full_name || 'Desconocido'} <br />
                                        <span className="text-xs text-gray-500">{payment.user?.email}</span>
                                    </TableCell>
                                    <TableCell>${payment.amount}</TableCell>
                                    <TableCell>{payment.method}</TableCell>
                                    <TableCell>
                                        <Badge
                                            className={
                                                payment.status === 'approved' ? 'bg-green-500 hover:bg-green-600 text-white border-0' :
                                                    payment.status === 'rejected' ? 'bg-red-500 hover:bg-red-600 text-white border-0' :
                                                        'bg-yellow-500 hover:bg-yellow-600 text-white border-0'
                                            }
                                        >
                                            {payment.status === 'pending' ? 'PENDIENTE' :
                                                payment.status === 'approved' ? 'APROBADO' :
                                                    payment.status === 'rejected' ? 'RECHAZADO' : (payment.status as string).toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(payment.created_at)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card ring-1 ring-border text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-foreground">{t.dashboard.admin.payment_modal.title}</DialogTitle>
                    </DialogHeader>
                    {selectedPayment && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground">{t.dashboard.admin.payment_modal.amount}</h4>
                                    <p className="text-lg font-bold text-foreground">${selectedPayment.amount}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground">{t.dashboard.admin.payment_modal.method}</h4>
                                    <p className="text-foreground">{selectedPayment.method}</p>
                                </div>
                                {selectedPayment.plan_type && (
                                    <div className="col-span-2 sm:col-span-1">
                                        <h4 className="font-medium text-sm text-muted-foreground">Plan Solicitado</h4>
                                        <Badge variant="outline" className="mt-1 border-border text-foreground">
                                            {selectedPayment.plan_type}
                                        </Badge>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground">{t.dashboard.admin.payment_modal.date}</h4>
                                    <p className="text-foreground">{formatDateFull(selectedPayment.month_paid)}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground">{t.dashboard.admin.payment_modal.reference}</h4>
                                    <p className="font-mono text-sm pt-1 text-foreground">{selectedPayment.reference_number || 'N/A'}</p>
                                </div>
                            </div>

                            {selectedPayment.notes && (
                                <div className="mt-4 bg-yellow-500/10 p-3 rounded border border-yellow-500/20">
                                    <p className="text-xs text-yellow-600 font-bold uppercase mb-1">{t.dashboard.admin.payment_modal.notes}</p>
                                    <p className="text-sm text-foreground italic">"{selectedPayment.notes}"</p>
                                </div>
                            )}

                            {selectedPayment.proof_url && (
                                <div>
                                    <h4 className="font-medium text-sm text-muted-foreground mb-2">{t.dashboard.admin.payment_modal.proof}</h4>
                                    <a href={selectedPayment.proof_url} target="_blank" rel="noopener noreferrer">
                                        <img
                                            src={selectedPayment.proof_url}
                                            alt="Proof"
                                            className="w-full h-48 object-cover rounded-md border border-border hover:opacity-90 transition-opacity"
                                        />
                                    </a>
                                </div>
                            )}

                            {selectedPayment.sender_name && (
                                <div className="bg-muted/30 p-3 rounded text-sm text-foreground">
                                    <p><strong>{t.dashboard.admin.payment_modal.sender}:</strong> {selectedPayment.sender_name}</p>
                                    {selectedPayment.cedula && <p><strong>{t.dashboard.admin.payment_modal.id}:</strong> {selectedPayment.cedula}</p>}
                                </div>
                            )}

                            {selectedPayment.status === 'pending' && (
                                <div className="pt-4 border-t border-border">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-1 text-foreground">{t.dashboard.admin.payment_modal.grant_membership}</label>
                                        <Select value={selectedTier} onValueChange={(val) => setSelectedTier(val as 'VIP' | 'Access' | 'Basic' | 'Not a Member')}>
                                            <SelectTrigger className="border-input text-foreground bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover text-popover-foreground border-border">
                                                <SelectItem value="VIP">VIP</SelectItem>
                                                <SelectItem value="Access">ACCESO</SelectItem>
                                                <SelectItem value="Basic">BASIC</SelectItem>
                                                <SelectItem value="Not a Member">{t.dashboard.users.tiers.not_a_member}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground mt-1">{t.dashboard.admin.payment_modal.grant_note}</p>
                                    </div>

                                    {isDenyMode && (
                                        <div className="mb-4 animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-sm font-medium mb-1 text-destructive">
                                                {t.dashboard.users.invoice.reason_denial} *
                                            </label>
                                            <textarea
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                                                placeholder={t.dashboard.admin.payment_modal.deny_reason_placeholder}
                                                value={denyReason}
                                                onChange={(e) => setDenyReason(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <div className="flex gap-2 justify-end">
                                        {isDenyMode ? (
                                            <>
                                                <Button variant="outline" onClick={() => setIsDenyMode(false)} className="text-foreground border-border hover:bg-muted">
                                                    Cancel
                                                </Button>
                                                <Button variant="destructive" onClick={() => handleAction('rejected')} disabled={!!updating}>
                                                    {updating === 'rejected' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Confirm Denial
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="destructive" onClick={() => handleAction('rejected')} disabled={!!updating}>
                                                    {t.dashboard.admin.payment_modal.deny}
                                                </Button>
                                                <Button onClick={() => handleAction('approved')} disabled={!!updating} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                                    {updating === 'approved' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    {t.dashboard.admin.payment_modal.approve}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    )
}
