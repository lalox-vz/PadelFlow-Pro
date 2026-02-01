"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { DollarSign, CheckCircle2, ClipboardList, Send, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import confetti from "canvas-confetti"
import { useRouter } from "next/navigation"

export default function ShiftClosurePage() {
    const { user, profile, signOut } = useAuth()
    const { toast } = useToast()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        cash: '',
        transfer: '',
        card: '',
        notes: ''
    })

    const orgId = profile?.organization_id

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!orgId || !user) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('shift_reports')
                .insert({
                    organization_id: orgId,
                    user_id: user.id,
                    cash_amount: parseFloat(formData.cash || '0'),
                    transfer_amount: parseFloat(formData.transfer || '0'),
                    card_amount: parseFloat(formData.card || '0'),
                    notes: formData.notes
                })

            if (error) throw error

            setSuccess(true)

            // Victory Confetti - "Set Point Effect"
            const duration = 3 * 1000
            const animationEnd = Date.now() + duration
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now()

                if (timeLeft <= 0) {
                    return clearInterval(interval)
                }

                const particleCount = 50 * (timeLeft / duration)

                // Lime Green (#ccff00) and White
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                    colors: ['#ccff00', '#ffffff']
                })
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                    colors: ['#ccff00', '#ffffff']
                })
            }, 250)

            toast({
                title: "🏆 ¡Set Point!",
                description: "Cierre de turno registrado correctamente."
            })
        } catch (error: any) {
            console.error('Error closing shift:', error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar el reporte."
            })
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 text-center animate-in fade-in zoom-in duration-500">
                <Card className="w-full max-w-md bg-zinc-900 border-[#ccff00]/30 shadow-[0_0_50px_rgba(204,255,0,0.1)]">
                    <CardHeader className="pb-2">
                        <div className="mx-auto mb-4 h-24 w-24 bg-[#ccff00]/10 rounded-full flex items-center justify-center border border-[#ccff00]/20">
                            <CheckCircle2 className="h-12 w-12 text-[#ccff00] animate-bounce" />
                        </div>
                        <CardTitle className="text-3xl text-white font-bold">¡Juego, Set y Partido!</CardTitle>
                        <CardDescription className="text-zinc-400 text-lg">
                            Has cerrado tu turno con éxito.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="bg-black/40 rounded-lg p-4 space-y-2 border border-zinc-800">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Efectivo:</span>
                                <span className="text-white font-mono font-bold text-emerald-400">${parseFloat(formData.cash || '0').toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Transferencias:</span>
                                <span className="text-white font-mono font-bold text-blue-400">${parseFloat(formData.transfer || '0').toFixed(2)}</span>
                            </div>
                            <div className="border-t border-zinc-800 pt-2 flex justify-between">
                                <span className="text-zinc-300 font-bold">Total Declarado:</span>
                                <span className="text-[#ccff00] font-mono font-bold text-lg">
                                    ${(parseFloat(formData.cash || '0') + parseFloat(formData.transfer || '0')).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3">
                        <Button
                            onClick={async () => {
                                await signOut()
                                router.push('/login')
                            }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-12 text-lg"
                        >
                            Finalizar Sesión (Salir)
                        </Button>
                        <Button
                            onClick={() => { setSuccess(false); setFormData({ cash: '', transfer: '', card: '', notes: '' }) }}
                            variant="ghost"
                            className="text-zinc-500 hover:text-white"
                        >
                            Volver al Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <ClipboardList className="h-8 w-8 text-emerald-500" />
                    Cierre de Turno
                </h1>
                <p className="text-zinc-400 mt-2">
                    Registra los movimientos de caja y novedades antes de finalizar tu jornada.
                </p>
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-white">Declaración de Valores</CardTitle>
                    <CardDescription>
                        Ingresa los montos totales recaudados durante tu turno.
                        <br />
                        <span className="text-xs text-zinc-500 italic">Fecha: {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}</span>
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="cash" className="text-emerald-400 font-medium flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Efectivo ($)
                                </Label>
                                <Input
                                    id="cash"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.cash}
                                    onChange={(e) => setFormData({ ...formData, cash: e.target.value })}
                                    className="bg-zinc-950 border-zinc-700 text-lg focus:ring-[#ccff00] focus:border-[#ccff00]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="transfer" className="text-blue-400 font-medium flex items-center gap-2">
                                    <Send className="h-4 w-4" />
                                    Transferencias / Zelle ($)
                                </Label>
                                <Input
                                    id="transfer"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.transfer}
                                    onChange={(e) => setFormData({ ...formData, transfer: e.target.value })}
                                    className="bg-zinc-950 border-zinc-700 text-lg"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes" className="text-zinc-300">Notas / Novedades</Label>
                            <Textarea
                                id="notes"
                                placeholder="Ej: Faltó cobrar la cancha 3 a Juan Pérez. La red de la cancha 2 está floja."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="bg-zinc-950 border-zinc-700 min-h-[100px]"
                            />
                            <p className="text-xs text-zinc-500">
                                Deja cualquier mensaje importante para el Owner o el siguiente turno.
                            </p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t border-zinc-800 pt-6">
                        <p className="text-xs text-zinc-500">
                            * Esta acción quedará registrada con tu usuario.
                        </p>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="bg-[#ccff00] hover:bg-[#b3e600] text-black font-bold min-w-[150px]"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ClipboardList className="h-4 w-4 mr-2" />}
                            {loading ? 'Enviando...' : 'Cerrar Turno'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
