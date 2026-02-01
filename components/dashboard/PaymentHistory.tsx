"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { useLanguage } from "@/context/LanguageContext"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Payment } from "@/types"

export default function PaymentHistory() {
    const { user } = useAuth()
    const { t, language } = useLanguage()
    const [payments, setPayments] = useState<Payment[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const locale = language === 'es' ? es : enUS

    useEffect(() => {
        if (user) fetchPayments()
    }, [user])

    const fetchPayments = async () => {
        const { data, error } = await supabase
            .from('payments')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error(error)
        } else {
            setPayments(data)
        }
        setLoading(false)
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-500/10 text-green-500'
            case 'rejected': return 'bg-destructive/10 text-destructive'
            default: return 'bg-yellow-500/10 text-yellow-500'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'approved': return t.dashboard.payment_history.status.approved
            case 'rejected': return t.dashboard.payment_history.status.rejected
            default: return t.dashboard.payment_history.status.pending
        }
    }

    const handlePaymentClick = (payment: Payment) => {
        setSelectedPayment(payment)
        setIsDialogOpen(true)
    }

    if (loading) return <div className="p-8 text-center text-muted-foreground">{t.dashboard.client.loading}</div>

    return (
        <>
            <Card className="mt-8 ring-1 ring-border">
                <CardHeader>
                    <CardTitle className="text-foreground">{t.dashboard.payment_history.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    {payments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">{t.dashboard.payment_history.no_payments}</p>
                    ) : (
                        <div className="space-y-4">
                            {payments.map(payment => (
                                <div
                                    key={payment.id}
                                    onClick={() => handlePaymentClick(payment)}
                                    className="flex justify-between items-center border-b border-border pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {format(new Date(payment.month_paid), "MMMM yyyy", { locale })} - ${payment.amount}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {payment.method} {payment.reference_number && `• Ref: ${payment.reference_number}`}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(payment.created_at), "PPP", { locale })}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>
                                        {getStatusLabel(payment.status)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Invoice Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md w-full mx-auto rounded-xl ring-1 ring-border bg-card">
                    <DialogHeader>
                        <DialogTitle className="text-center text-foreground">{t.dashboard.users.invoice.title}</DialogTitle>
                    </DialogHeader>

                    {selectedPayment && (
                        <div className="space-y-6">
                            {/* Status Banner */}
                            <div className={`p-6 rounded-xl text-center flex flex-col items-center justify-center ${getStatusColor(selectedPayment.status)}`}>
                                <span className="font-bold text-xl tracking-wide">{getStatusLabel(selectedPayment.status)}</span>
                                {selectedPayment.invoice_number && (
                                    <div
                                        className="text-lg font-mono mt-2 bg-background/20 px-3 py-1 rounded cursor-pointer hover:bg-background/30 transition-colors flex items-center gap-2 group"
                                        onClick={() => {
                                            navigator.clipboard.writeText(selectedPayment.invoice_number || '')
                                            alert("Invoice # copied!")
                                        }}
                                        title="Click to copy"
                                    >
                                        <span className="text-primary font-bold tracking-widest">{selectedPayment.invoice_number}</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">📋</span>
                                    </div>
                                )}
                            </div>

                            {/* Denial Reason & Support */}
                            {selectedPayment.status === 'rejected' && (
                                <div className="space-y-3">
                                    {selectedPayment.denial_reason && (
                                        <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                                            <h4 className="text-destructive font-semibold text-sm mb-1 uppercase tracking-wider">{t.dashboard.users.invoice.reason_denial}</h4>
                                            <p className="text-destructive/90 text-sm leading-relaxed">{selectedPayment.denial_reason}</p>
                                        </div>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="w-full border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600"
                                        onClick={() => window.open(`https://wa.me/584142605230?text=Mi pago fue rechazado para mi membresia en Olimpo. (Ref: ${selectedPayment.reference_number || 'N/A'})`, '_blank')}
                                    >
                                        <svg viewBox="0 0 24 24" className="h-5 w-5 mr-2 fill-current">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                        </svg>
                                        Contactar Soporte
                                    </Button>
                                </div>
                            )}

                            {/* Details List */}
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center border-b border-border pb-2">
                                    <span className="text-muted-foreground">{t.dashboard.users.invoice.amount}</span>
                                    <span className="font-bold text-lg text-foreground">${selectedPayment.amount}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border pb-2">
                                    <span className="text-muted-foreground">{t.dashboard.users.invoice.date}</span>
                                    <span className="font-medium text-foreground">{format(new Date(selectedPayment.created_at), "PPP", { locale })}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-border pb-2">
                                    <span className="text-muted-foreground">{t.dashboard.users.invoice.method}</span>
                                    <span className="font-medium text-foreground">{selectedPayment.method}</span>
                                </div>
                                {selectedPayment.notes && (
                                    <div className="border-b border-border pb-2">
                                        <span className="text-muted-foreground block text-xs mb-1 uppercase tracking-wide">{t.dashboard.users.invoice.notes}</span>
                                        <p className="text-sm text-foreground italic bg-muted p-2 rounded">"{selectedPayment.notes}"</p>
                                    </div>
                                )}
                                {selectedPayment.reference_number && (
                                    <div className="flex justify-between items-center border-b border-border pb-2">
                                        <span className="text-muted-foreground">{t.dashboard.users.invoice.reference}</span>
                                        <span className="font-medium font-mono text-foreground">{selectedPayment.reference_number}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button className="w-full" onClick={() => setIsDialogOpen(false)}>
                                    {t.dashboard.users.invoice.close}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
