"use client"

import { useState, useEffect, Suspense } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { UploadCloud, Loader2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"
import { useSearchParams } from "next/navigation"

import { useToast } from "@/hooks/use-toast"

function PaymentContent() {
    const { user } = useAuth()
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const searchParams = useSearchParams()

    const [planName, setPlanName] = useState('')
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState<'Cash' | 'Zelle' | 'PagoMovil' | 'Facebank'>('PagoMovil')
    const [reference, setReference] = useState('')
    const [monthPaid, setMonthPaid] = useState(new Date().toISOString().split('T')[0])

    // New fields
    const [senderName, setSenderName] = useState('')
    const [cedula, setCedula] = useState('')
    const [senderPhone, setSenderPhone] = useState('')
    const [notes, setNotes] = useState('')

    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    // Exchange Rate
    const [tasa, setTasa] = useState('400')

    // Pre-fill from URL
    useEffect(() => {
        const plan = searchParams.get('plan')
        const amt = searchParams.get('amount')
        const mtd = searchParams.get('method')

        if (plan) setPlanName(plan)
        if (amt) setAmount(amt)
        if (mtd && ['Cash', 'Zelle', 'PagoMovil', 'Facebank'].includes(mtd)) {
            setMethod(mtd as any)
        }
    }, [searchParams])

    // Fetch global rate
    useEffect(() => {
        const fetchRate = async () => {
            const { data, error } = await supabase
                .from('app_settings')
                .select('value')
                .eq('key', 'exchange_rate')
                .single()

            if (data?.value) {
                setTasa(String(data.value))
            }
        }
        fetchRate()
    }, [])

    const helpers = {
        isCash: method === 'Cash',
        isZelleOrFacebank: method === 'Zelle' || method === 'Facebank',
        isPagoMovil: method === 'PagoMovil',
        currencySymbol: method === 'PagoMovil' ? 'Bs.' : '$'
    }
    const { isCash, isZelleOrFacebank, isPagoMovil, currencySymbol } = helpers

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null
        if (selectedFile) {
            if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
                toast({
                    title: "Error",
                    description: t.dashboard.payments.errors.file_too_large,
                    variant: "destructive"
                })
                e.target.value = '' // Reset input
                setFile(null)
                return
            }
        }
        setFile(selectedFile)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Validation
            if (!file) {
                throw new Error(t.dashboard.payments.errors.proof_required)
            }
            if (!amount) throw new Error(t.dashboard.payments.errors.amount_required)

            // Conditional validation
            if (!isCash && !reference) throw new Error(t.dashboard.payments.errors.ref_required)
            if (isZelleOrFacebank && !senderName) throw new Error(t.dashboard.payments.errors.name_required)
            if (isPagoMovil) {
                if (!cedula) throw new Error(t.dashboard.payments.errors.cedula_required)
                if (!senderPhone) throw new Error(t.dashboard.payments.errors.phone_required)
                if (!tasa) throw new Error("La tasa de cambio es obligatoria")
            }

            let proofUrl = null

            if (file) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `payment-proofs/${user?.id}/${fileName}`

                // 20-second timeout for upload
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT')), 20000)
                )

                const uploadPromise = supabase.storage
                    .from('payment-proofs')
                    .upload(filePath, file)

                try {
                    const result = await Promise.race([uploadPromise, timeoutPromise]) as any
                    if (result.error) throw result.error
                } catch (err: any) {
                    // Use the user-requested specific error message for upload failures
                    throw new Error(t.dashboard.payments.errors.upload_issue)
                }

                const { data } = supabase.storage.from('payment-proofs').getPublicUrl(filePath)
                proofUrl = data.publicUrl
            }

            // Calculate amount in USD
            let finalAmount = parseFloat(amount)
            if (isPagoMovil) {
                finalAmount = parseFloat(amount) / parseFloat(tasa)
            }

            // Append Plan Name to notes if present
            let finalNotes = notes
            if (planName) {
                finalNotes = `Plan: ${planName}. ` + finalNotes
            }

            const { error } = await supabase.from('payments').insert({
                user_id: user?.id,
                amount: finalAmount, // Saved in USD
                method,
                reference_number: isCash ? null : reference,
                month_paid: monthPaid,
                proof_url: proofUrl,
                status: 'pending',
                sender_name: (isZelleOrFacebank || isPagoMovil) ? senderName : null,
                cedula: isPagoMovil ? cedula : null,
                sender_phone: isPagoMovil ? senderPhone : null,
                notes: finalNotes || null,
                plan_type: planName || null
            })

            if (error) throw error

            setSuccess(true)
            // Reset form
            setAmount('')
            setReference('')
            setSenderName('')
            setCedula('')
            setSenderPhone('')
            setNotes('')
            setFile(null)
            setPlanName('')
        } catch (error: any) {
            console.error(error)
            let errorMsg = t.dashboard.payments.errors.submit_error

            // Check for specific technical errors and provide friendly Spanish translations
            const rawError = error.message || ''
            if (rawError.includes("Could not find the 'plan_type' column")) {
                errorMsg = "El sistema se está actualizando. Por favor intente nuevamente en unos momentos."
            } else if (rawError.includes("row-level security")) {
                errorMsg = "No tiene permisos para realizar esta acción."
            } else if (rawError.includes("TIMEOUT")) {
                errorMsg = "La subida del comprobante tardó demasiado. Verifique su conexión."
            } else if (rawError) {
                // Use the raw error if it's already a custom thrown error (which are likely already translated if we did our job right in the validation steps)
                // But if it looks very technical (contains camelCase or underscores often), maybe hide it? 
                // For now, let's use the provided message if available, otherwise the generic one.
                // However, the prompt asks for ALL errors to be in Spanish.
                // If the error comes from Supabase/Postgres it will be in English.
                // So safest bet is: if it's not one of our custom validations, show generic error.

                // How do we know if it's our custom validation?
                // Our custom validations are thrown as `new Error("Spanish String")`.
                // Supabase errors are objects/strings that are usually English.

                // Simple heuristic: If it contains known Spanish words or is short, show it.
                // If it looks like "relation 'public.payments' does not exist", generic.

                if (rawError.match(/[áéíóúñ]/i) || rawError.includes('tasa') || rawError.includes('obligatoria') || rawError.includes('requerido')) {
                    errorMsg = rawError
                } else {
                    errorMsg = "Ha ocurrido un error procesando su solicitud. Por favor contacte a soporte si el problema persiste."
                }
            }

            toast({
                title: "Error",
                description: errorMsg,
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="max-w-md mx-auto mt-10 p-6 bg-card rounded-lg shadow-md text-center ring-1 ring-border">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{t.dashboard.payments.submit_success_title}</h2>
                <p className="text-muted-foreground mb-6">{t.dashboard.payments.submit_success_msg}</p>
                {notes && (
                    <div className="bg-muted p-4 rounded mb-6 text-sm text-muted-foreground text-left">
                        <span className="font-semibold block mb-1">Tu nota:</span>
                        {notes}
                    </div>
                )}
                <Button onClick={() => setSuccess(false)}>{t.dashboard.payments.submit_another}</Button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6 text-foreground">{t.dashboard.payments.title}</h1>
            <div className="bg-card p-6 rounded-lg shadow-md ring-1 ring-border">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Method Selection */}
                    <div>
                        <label className="block text-sm font-medium text-foreground">{t.dashboard.payments.form.method}</label>
                        <select
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-background border border-border text-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            value={method}
                            onChange={(e) => setMethod(e.target.value as any)}
                        >
                            <option value="PagoMovil">Pago Movil</option>
                            <option value="Zelle">Zelle</option>
                            <option value="Facebank">Facebank</option>
                            <option value="Cash">Cash (Efectivo)</option>
                        </select>
                    </div>

                    {/* Common Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground">{t.dashboard.payments.form.date}</label>
                            <Input
                                type="date"
                                required
                                value={monthPaid}
                                onChange={(e) => setMonthPaid(e.target.value)}
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground">{t.dashboard.payments.form.amount} ({currencySymbol})</label>
                            <div className="relative mt-1 rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="text-muted-foreground sm:text-sm">{currencySymbol}</span>
                                </div>
                                <Input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="pl-12 bg-background border-border text-foreground"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Plan Name Field (New) */}
                    <div>
                        <label className="block text-sm font-medium text-foreground">Plan</label>
                        <Input
                            type="text"
                            value={planName}
                            onChange={(e) => setPlanName(e.target.value)}
                            placeholder="Ej. VIP, Acceso..."
                            className="bg-background border-border text-foreground"
                        />
                    </div>

                    {/* Conditional Fields */}
                    {!isCash && (
                        <div>
                            <label className="block text-sm font-medium text-foreground">{t.dashboard.payments.form.reference}</label>
                            <Input
                                type="text"
                                placeholder="Ref #"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                required={!isCash}
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                    )}

                    {isZelleOrFacebank && (
                        <div>
                            <label className="block text-sm font-medium text-foreground">{t.dashboard.payments.form.sender_name}</label>
                            <Input
                                type="text"
                                placeholder="Name on account"
                                value={senderName}
                                onChange={(e) => setSenderName(e.target.value)}
                                required
                                className="bg-background border-border text-foreground"
                            />
                        </div>
                    )}

                    {isPagoMovil && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground">{t.dashboard.payments.form.cedula}</label>
                                    <Input
                                        type="text"
                                        placeholder="V-12345678"
                                        value={cedula}
                                        onChange={(e) => setCedula(e.target.value)}
                                        required
                                        className="bg-background border-border text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground">{t.dashboard.payments.form.phone}</label>
                                    <Input
                                        type="text"
                                        placeholder="0414-1234567"
                                        value={senderPhone}
                                        onChange={(e) => setSenderPhone(e.target.value)}
                                        required
                                        className="bg-background border-border text-foreground"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground">
                                    Tasa de Cambio (Bs/$)
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="400.00"
                                    value={tasa}
                                    onChange={(e) => setTasa(e.target.value)}
                                    required
                                    className="bg-background border-border text-foreground"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Monto en USD calculado: ${(parseFloat(amount || '0') / parseFloat(tasa || '1')).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Notes Field */}
                    <div>
                        <label className="block text-sm font-medium text-foreground">{t.dashboard.payments.form.notes}</label>
                        <textarea
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-background border border-border text-foreground focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            rows={3}
                            placeholder="Optional..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Proof Upload */}
                    <div>
                        <label className="block text-sm font-medium text-foreground">
                            {isCash ? t.dashboard.payments.form.proof_cash : t.dashboard.payments.form.proof_digital}
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-md hover:bg-muted/10 transition-colors cursor-pointer relative">
                            <div className="space-y-1 text-center">
                                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                                <div className="flex text-sm text-foreground justify-center">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none">
                                        <span>{t.dashboard.payments.form.upload_placeholder}</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                </div>
                                <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                                {file && <p className="text-sm text-green-500 font-semibold mt-2">{t.dashboard.payments.form.upload_placeholder}: {file.name}</p>}
                            </div>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {language === 'es' ? "Procesando tu pago, por favor espera..." : "Processing payment, please wait..."}
                            </>
                        ) : t.dashboard.payments.form.submit_btn}
                    </Button>
                </form>
            </div>
        </div >
    )
}

export default function PaymentUploadPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando formulario...</div>}>
            <PaymentContent />
        </Suspense>
    )
}
