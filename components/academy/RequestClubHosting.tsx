"use client"

import { useState, useEffect } from "react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { Building2, Send } from "lucide-react"

interface Club {
    id: string
    name: string
    location?: string
}

export function RequestClubHosting({ academyId }: { academyId: string }) {
    const { user } = useAuth()
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [clubs, setClubs] = useState<Club[]>([])
    const [selectedClubId, setSelectedClubId] = useState<string>("")
    const [message, setMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const [hasExistingRequest, setHasExistingRequest] = useState(false)

    useEffect(() => {
        if (open) {
            fetchClubs()
            checkExistingRequests()
        }
    }, [open])

    const fetchClubs = async () => {
        const { data, error } = await supabase
            .from('entities')
            .select('id, name, location')
            .eq('type', 'CLUB')
            .order('name')

        if (!error && data) {
            setClubs(data)
        }
    }

    const checkExistingRequests = async () => {
        const { data } = await supabase
            .from('hosting_requests')
            .select('id')
            .eq('academy_id', academyId)
            .in('status', ['pending', 'approved'])
            .limit(1)

        setHasExistingRequest(!!data && data.length > 0)
    }

    const handleSubmit = async () => {
        if (!selectedClubId) {
            toast({
                title: "Error",
                description: "Por favor selecciona un club",
                variant: "destructive"
            })
            return
        }

        setLoading(true)

        try {
            // Create hosting request
            const { data: request, error: requestError } = await supabase
                .from('hosting_requests')
                .insert({
                    academy_id: academyId,
                    club_id: selectedClubId,
                    message,
                    status: 'pending'
                })
                .select()
                .single()

            if (requestError) throw requestError

            // Get club owner to send notification
            const { data: clubData } = await supabase
                .from('entities')
                .select('owner_id, name')
                .eq('id', selectedClubId)
                .single()

            if (clubData?.owner_id) {
                // Create notification for club owner
                await supabase
                    .from('notifications')
                    .insert({
                        user_id: clubData.owner_id,
                        type: 'hosting_request',
                        title: '📨 Nueva Solicitud de Hosting',
                        message: `Una academia quiere unirse a tu club ${clubData.name}`,
                        action_type: 'accept_decline',
                        related_id: request.id,
                        related_type: 'hosting_request',
                        priority: 'high'
                    })
            }

            toast({
                title: "✅ Solicitud Enviada",
                description: "El club recibirá tu solicitud y te notificará su decisión"
            })

            setOpen(false)
            setSelectedClubId("")
            setMessage("")
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "No se pudo enviar la solicitud",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    if (hasExistingRequest) {
        return (
            <div className="p-4 border border-blue-500 rounded-lg bg-blue-500/10">
                <p className="text-sm text-blue-400">
                    Ya tienes una solicitud de hosting activa. Revisa tus notificaciones para ver el estado.
                </p>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-[#ccff00] text-black hover:bg-[#b3e600]">
                    <Building2 className="h-4 w-4 mr-2" />
                    Solicitar Hosting de Club
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Solicitar Hosting de Club</DialogTitle>
                    <DialogDescription>
                        Selecciona un club que desees que sea tu host. El club recibirá tu solicitud y podrá aprobarla o rechazarla.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="club">Club</Label>
                        <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                            <SelectTrigger id="club">
                                <SelectValue placeholder="Selecciona un club" />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map((club) => (
                                    <SelectItem key={club.id} value={club.id}>
                                        {club.name} {club.location && `- ${club.location}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Mensaje (Opcional)</Label>
                        <Textarea
                            id="message"
                            placeholder="Cuéntale al club por qué quieres unirte..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !selectedClubId}
                        className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                    >
                        {loading ? (
                            <>Enviando...</>
                        ) : (
                            <>
                                <Send className="h-4 w-4 mr-2" />
                                Enviar Solicitud
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
