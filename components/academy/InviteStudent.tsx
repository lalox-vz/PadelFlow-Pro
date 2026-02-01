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
import { UserPlus, Send } from "lucide-react"

export function InviteStudent({ academyId }: { academyId: string }) {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [studentEmail, setStudentEmail] = useState("")
    const [programName, setProgramName] = useState("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!studentEmail || !studentEmail.includes('@')) {
            toast({
                title: "Error",
                description: "Por favor ingresa un email válido",
                variant: "destructive"
            })
            return
        }

        setLoading(true)

        try {
            // Create student request
            const { data: request, error: requestError } = await supabase
                .from('student_requests')
                .insert({
                    academy_id: academyId,
                    student_email: studentEmail.toLowerCase().trim(),
                    program_name: programName || null,
                    message: message || null,
                    status: 'pending'
                })
                .select()
                .single()

            if (requestError) throw requestError

            // Check if user exists and send notification
            const { data: userData } = await supabase
                .from('auth.users')
                .select('id')
                .eq('email', studentEmail.toLowerCase().trim())
                .single()

            if (userData) {
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: userData.id,
                        type: 'student_request',
                        title: '🎓 Invitación a Academia',
                        message: `Has sido invitado a unirte a una academia${programName ? ` en el programa ${programName}` : ''}`,
                        action_type: 'accept_decline',
                        related_id: request.id,
                        related_type: 'student_request',
                        priority: 'normal'
                    })
            }

            toast({
                title: "✅ Invitación Enviada",
                description: userData
                    ? "El estudiante recibirá una notificación"
                    : "El estudiante recibirá la invitación cuando se registre"
            })

            setOpen(false)
            setStudentEmail("")
            setProgramName("")
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
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invitar Estudiante
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Invitar Estudiante</DialogTitle>
                    <DialogDescription>
                        Envía una invitación a un estudiante para que se una a tu academia.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email del Estudiante *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="estudiante@ejemplo.com"
                            value={studentEmail}
                            onChange={(e) => setStudentEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="program">Programa (Opcional)</Label>
                        <Input
                            id="program"
                            placeholder="Ej: Padel Principiantes, Avanzado, etc."
                            value={programName}
                            onChange={(e) => setProgramName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Mensaje (Opcional)</Label>
                        <Textarea
                            id="message"
                            placeholder="Mensaje personalizado para el estudiante..."
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
                        disabled={loading || !studentEmail}
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
