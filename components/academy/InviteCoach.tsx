"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { UserCheck, Send } from "lucide-react"

export function InviteCoach({ academyId }: { academyId: string }) {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [coachEmail, setCoachEmail] = useState("")
    const [specialty, setSpecialty] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!coachEmail || !coachEmail.includes('@')) {
            toast({
                title: "Error",
                description: "Por favor ingresa un email válido",
                variant: "destructive"
            })
            return
        }

        setLoading(true)

        try {
            // Create coach invitation
            const { data: invitation, error: invitationError } = await supabase
                .from('coach_invitations')
                .insert({
                    academy_id: academyId,
                    coach_email: coachEmail.toLowerCase().trim(),
                    specialty: specialty || null,
                    message: message || null,
                    status: 'pending'
                })
                .select()
                .single()

            if (invitationError) throw invitationError

            // Check if user exists and send notification
            const { data: userData } = await supabase
                .from('auth.users')
                .select('id')
                .eq('email', coachEmail.toLowerCase().trim())
                .single()

            if (userData) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userData.id,
                        type: 'coach_invitation',
                        title: '🏆 Invitación de Coach',
                        message: `Has sido invitado a ser coach en una academia${specialty ? ` para ${specialty}` : ''}`,
                        action_type: 'accept_decline',
                        related_id: invitation.id,
                        related_type: 'coach_invitation',
                        priority: 'high'
                    })
            }

            toast({
                title: "✅ Invitación Enviada",
                description: userData
                    ? "El coach recibirá una notificación"
                    : "El coach recibirá la invitación cuando se registre"
            })

            setOpen(false)
            setCoachEmail("")
            setSpecialty("")
            setMessage("")
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "No se pudo enviar la invitación",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#ccff00] text-black hover:bg-[#b3e600]">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Invitar Coach
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Invitar Coach</DialogTitle>
                    <DialogDescription>
                        Envía una invitación a un coach para que se una a tu academia.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email del Coach *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="coach@ejemplo.com"
                            value={coachEmail}
                            onChange={(e) => setCoachEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="specialty">Especialidad (Opcional)</Label>
                        <Input
                            id="specialty"
                            placeholder="Ej: Técnica, Táctica, Físico"
                            value={specialty}
                            onChange={(e) => setSpecialty(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Mensaje (Opcional)</Label>
                        <Textarea
                            id="message"
                            placeholder="Mensaje personalizado para el coach..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !coachEmail}
                        className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                    >
                        {loading ? (
                            <>Enviando...</>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar Invitación
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
