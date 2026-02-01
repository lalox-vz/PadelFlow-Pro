"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { Court } from "@/lib/booking-logic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Edit, MapPin, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"

// Extended Court interface for the frontend state which includes flattened details
interface ExtendedCourt extends Court {
    surface?: string;
    basePrice?: number;
}

export default function CourtsManagementPage() {
    const { profile } = useAuth()
    const { toast } = useToast()
    const orgId = profile?.organization_id
    const isStaff = profile?.role === 'club_staff'

    const [courts, setCourts] = useState<ExtendedCourt[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingCourt, setEditingCourt] = useState<ExtendedCourt | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        type: 'indoor' as 'indoor' | 'outdoor' | 'covered',
        surface: 'Césped Sintético',
        basePrice: 40,
        isActive: true
    })

    useEffect(() => {
        if (orgId) {
            loadCourts()
        }
    }, [orgId])

    const loadCourts = async () => {
        if (!orgId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('courts')
                .select('*')
                .eq('club_id', orgId)
                .order('name')

            if (error) throw error

            const mappedCourts: ExtendedCourt[] = data.map((c: any) => ({
                id: c.id,
                name: c.name,
                isActive: c.is_active,
                // Flatten details
                type: c.details?.type || 'indoor',
                surface: c.details?.surface,
                basePrice: c.details?.basePrice
            }))

            console.log("SQL Courts Loaded:", mappedCourts)
            setCourts(mappedCourts)
        } catch (error: any) {
            console.error("Error loading courts:", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar las canchas."
            })
        } finally {
            setLoading(false)
        }
    }

    const openAddModal = () => {
        setEditingCourt(null)
        setFormData({
            name: '',
            type: 'indoor',
            surface: 'Césped Sintético',
            basePrice: 40,
            isActive: true
        })
        setModalOpen(true)
    }

    const openEditModal = (court: ExtendedCourt) => {
        setEditingCourt(court)
        setFormData({
            name: court.name,
            type: court.type,
            surface: court.surface || 'Césped Sintético',
            basePrice: court.basePrice || 40,
            isActive: court.isActive
        })
        setModalOpen(true)
    }

    const handleSave = async () => {
        if (!orgId) return

        try {
            const courtPayload = {
                club_id: orgId,
                name: formData.name,
                is_active: formData.isActive,
                details: {
                    type: formData.type,
                    surface: formData.surface,
                    basePrice: formData.basePrice
                }
            }

            let error;
            if (editingCourt) {
                // Update
                const { error: upError } = await supabase
                    .from('courts')
                    .update(courtPayload)
                    .eq('id', editingCourt.id)
                error = upError
            } else {
                // Insert
                const { error: inError } = await supabase
                    .from('courts')
                    .insert(courtPayload)
                error = inError
            }

            if (error) throw error

            setModalOpen(false)
            toast({
                title: editingCourt ? "Cancha Actualizada" : "Cancha Creada",
                description: "Los cambios se han guardado exitosamente."
            })
            // Reload to reflect changes
            loadCourts()

        } catch (error: any) {
            console.error("Error saving court:", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar la cancha: " + error.message
            })
        }
    }

    const toggleCourtStatus = async (court: ExtendedCourt) => {
        if (!orgId) return

        try {
            const { error } = await supabase
                .from('courts')
                .update({ is_active: !court.isActive })
                .eq('id', court.id)

            if (error) throw error

            toast({
                title: "Estado Actualizado",
                description: `Cancha ${!court.isActive ? 'activada' : 'desactivada'} exitosamente.`
            })
            loadCourts() // Reload
        } catch (error: any) {
            console.error("Error toggling status:", error)
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo actualizar el estado."
            })
        }
    }

    if (!orgId) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-zinc-500">No se encontró organización asociada.</p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Gestión de Canchas</h1>
                    <p className="text-muted-foreground">Administra tu inventario físico y disponibilidad (SQL).</p>
                </div>
                {!isStaff && (
                    <Button onClick={openAddModal} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Añadir Cancha
                    </Button>
                )}
            </div>

            {/* Courts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courts.map((court) => (
                    <Card key={court.id} className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-white">{court.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <MapPin className="h-3 w-3" />
                                        {court.type === 'indoor' ? 'Interior' : court.type === 'outdoor' ? 'Exterior' : 'Cubierta'}
                                    </CardDescription>
                                </div>
                                <Badge variant={court.isActive ? "default" : "secondary"} className={cn(
                                    court.isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-zinc-700 text-zinc-400"
                                )}>
                                    {court.isActive ? 'Activa' : 'Mantenimiento'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {court.surface && (
                                <div className="text-sm">
                                    <span className="text-zinc-500">Superficie:</span>{' '}
                                    <span className="text-white">{court.surface}</span>
                                </div>
                            )}
                            {court.basePrice && (
                                <div className="flex items-center gap-2 text-sm">
                                    <DollarSign className="h-4 w-4 text-emerald-500" />
                                    <span className="text-white font-semibold">${court.basePrice}</span>
                                    <span className="text-zinc-500">/ hora</span>
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                {!isStaff ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(court)}
                                            className="flex-1 border-zinc-700 hover:bg-zinc-800"
                                        >
                                            <Edit className="h-3 w-3 mr-1" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleCourtStatus(court)}
                                            className={cn(
                                                "flex-1 border-zinc-700",
                                                court.isActive ? "hover:bg-red-500/10 hover:text-red-500" : "hover:bg-emerald-500/10 hover:text-emerald-500"
                                            )}
                                        >
                                            {court.isActive ? 'Desactivar' : 'Activar'}
                                        </Button>
                                    </>
                                ) : (
                                    <div className="w-full text-center py-2 text-xs text-zinc-500 italic border border-zinc-800 rounded bg-zinc-950/50">
                                        Modo Lectura
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add/Edit Modal */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingCourt ? 'Editar' : 'Añadir'} Cancha</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {editingCourt ? 'Modifica los datos de la cancha (SQL).' : 'Crea una nueva cancha para tu club (SQL).'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Cancha</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej. Cancha 1"
                                className="bg-zinc-900 border-zinc-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                            >
                                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-700">
                                    <SelectItem value="indoor">Interior (Panorámica)</SelectItem>
                                    <SelectItem value="outdoor">Exterior (Estándar)</SelectItem>
                                    <SelectItem value="covered">Cubierta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="surface">Superficie</Label>
                            <Input
                                id="surface"
                                value={formData.surface}
                                onChange={(e) => setFormData({ ...formData, surface: e.target.value })}
                                placeholder="Ej. Césped Sintético"
                                className="bg-zinc-900 border-zinc-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="basePrice">Precio Base ($/hora)</Label>
                            <Input
                                id="basePrice"
                                type="number"
                                value={formData.basePrice}
                                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
                                className="bg-zinc-900 border-zinc-700"
                            />
                        </div>

                        <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                            <div>
                                <Label htmlFor="isActive" className="font-medium">Estado Activo</Label>
                                <p className="text-xs text-zinc-500">Disponible para reservas</p>
                            </div>
                            <Switch
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                className="data-[state=checked]:bg-emerald-500"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)} className="border-zinc-700">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!formData.name.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {editingCourt ? 'Guardar Cambios' : 'Crear Cancha'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
