"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, Building2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface HostingRequest {
    id: string
    academy_id: string
    status: 'pending' | 'approved' | 'declined' | 'cancelled'
    message: string | null
    created_at: string
    academy: {
        name: string
        location?: string
    }
}

export function ClubHostingRequests({ clubId }: { clubId: string }) {
    const { toast } = useToast()
    const [requests, setRequests] = useState<HostingRequest[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchRequests()

        // Real-time subscription for new requests
        const channel = supabase
            .channel('hosting_requests_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'hosting_requests',
                filter: `club_id=eq.${clubId}`
            }, () => {
                fetchRequests()
            })
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [clubId])

    const fetchRequests = async () => {
        const { data, error } = await supabase
            .from('hosting_requests')
            .select(`
                id,
                academy_id,
                status,
                message,
                created_at,
                academy:entities!hosting_requests_academy_id_fkey (
                    name,
                    location
                )
            `)
            .eq('club_id', clubId)
            .order('created_at', { ascending: false })

        if (!error && data) {
            setRequests(data as any)
        }
        setLoading(false)
    }

    const handleResponse = async (requestId: string, status: 'approved' | 'declined') => {
        try {
            // Update request status
            const { error } = await supabase
                .from('hosting_requests')
                .update({
                    status,
                    responded_at: new Date().toISOString()
                })
                .eq('id', requestId)

            if (error) throw error

            toast({
                title: status === 'approved' ? '✅ Academia Vinculada' : '❌ Solicitud Rechazada',
                description: status === 'approved'
                    ? 'La academia ahora está vinculada a tu club'
                    : 'La solicitud ha sido rechazada'
            })

            fetchRequests()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            })
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendiente
                </Badge>
            case 'approved':
                return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aprobada
                </Badge>
            case 'declined':
                return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500">
                    <XCircle className="h-3 w-3 mr-1" />
                    Rechazada
                </Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    if (loading) {
        return <div className="text-center py-8 text-muted-foreground">Cargando solicitudes...</div>
    }

    if (requests.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No hay solicitudes de hosting</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Solicitudes de Hosting</h3>
            {requests.map((request) => (
                <Card key={request.id}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    {request.academy.name}
                                </CardTitle>
                                <CardDescription>
                                    {request.academy.location && `${request.academy.location} • `}
                                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: es })}
                                </CardDescription>
                            </div>
                            {getStatusBadge(request.status)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {request.message && (
                            <p className="text-sm text-muted-foreground mb-4 italic">
                                "{request.message}"
                            </p>
                        )}

                        {request.status === 'pending' && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="bg-[#ccff00] text-black hover:bg-[#b3e600]"
                                    onClick={() => handleResponse(request.id, 'approved')}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Aprobar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResponse(request.id, 'declined')}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rechazar
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
