"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Save, MapPin, Phone, Mail, Eye, Smartphone, CheckCircle2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface IdentitySectionProps {
    initialData: any
    onUpdate: () => void
}

export function IdentitySection({ initialData, onUpdate }: IdentitySectionProps) {
    const [formData, setFormData] = useState(initialData)
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Sync state when parent data loads
    useEffect(() => {
        setFormData(initialData)
    }, [initialData])

    const handleChange = (field: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }))
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'banner_url') => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        const fileSize = file.size / 1024 / 1024 // MB
        const limit = field === 'logo_url' ? 2 : 5

        if (fileSize > limit) {
            toast({ variant: "destructive", title: "Archivo muy grande", description: `El límite para ${field === 'logo_url' ? 'Logo' : 'Banner'} es de ${limit}MB.` })
            return
        }

        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${formData.id}/${field}_${Date.now()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from('club-assets')
                .upload(fileName, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('club-assets')
                .getPublicUrl(fileName)

            handleChange(field, publicUrl)

            // Auto-save the URL to entity immediately
            await supabase.from('entities').update({ [field]: publicUrl }).eq('id', formData.id)

            // CRITICAL: Refresh parent data so persistence works across tabs
            onUpdate()

            toast({ title: "Imagen subida", description: "Se ha actualizado correctamente." })

        } catch (error: any) {
            console.error('Upload error:', error)
            toast({ variant: "destructive", title: "Error al subir", description: error.message })
        } finally {
            setUploading(false)
        }
    }

    const handleViewAsPlayer = () => {
        if (formData.id) {
            window.open(`/club/${formData.id}`, '_blank')
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await supabase
                .from('entities')
                .update({
                    name: formData.name,
                    business_email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    description: formData.description
                })
                .eq('id', formData.id)

            if (error) throw error
            toast({ title: "Guardado", description: "Identidad actualizada correctamente." })
            onUpdate() // Refresh parent if needed
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* FORM */}
            <div className="lg:col-span-2 space-y-6">
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre del Club</Label>
                                <Input
                                    value={formData.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 focus:border-[#ccff00]/50"
                                    placeholder="Ej. Olimpo Padel Club"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email de Contacto</Label>
                                <Input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="bg-zinc-950 border-zinc-800"
                                    placeholder="contacto@club.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input
                                    value={formData.phone || ''}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    className="bg-zinc-950 border-zinc-800"
                                    placeholder="+58 412 ..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Dirección</Label>
                                <Input
                                    value={formData.address || ''}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    className="bg-zinc-950 border-zinc-800"
                                    placeholder="Av. Principal..."
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <Label>Descripción / Bio</Label>
                                <Textarea
                                    value={formData.description || ''}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className="bg-zinc-950 border-zinc-800 min-h-[100px]"
                                    placeholder="Cuenta tu historia, servicios y lo que hace único a tu club..."
                                />
                                <p className="text-xs text-zinc-500 text-right">
                                    {(formData.description || '').length} caracteres
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={handleSave}
                                disabled={loading}
                                className="bg-zinc-100 text-zinc-900 hover:bg-zinc-300"
                            >
                                {loading ? <span className="animate-spin mr-2">⏳</span> : <Save className="w-4 h-4 mr-2" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* PREVIEW */}
            <div className="lg:col-span-1">
                <div className="sticky top-6 space-y-4">
                    <div className="flex items-center justify-between text-zinc-400 text-sm px-2">
                        <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> Vista Previa</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleViewAsPlayer}
                            className="h-6 text-[#ccff00] hover:text-[#ccff00] hover:bg-[#ccff00]/10"
                        >
                            <Eye className="w-3 h-3 mr-1" /> Ver como jugador
                        </Button>
                    </div>

                    {/* PHONE MOCKUP */}
                    <div className="relative mx-auto border-gray-800 bg-gray-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl overflow-hidden ring-1 ring-white/10">
                        {/* Notch */}
                        <div className="absolute top-0 inset-x-0 h-6 bg-gray-800 rounded-b-[1rem] z-20 w-40 mx-auto"></div>

                        {/* Screen Content */}
                        <div className="w-full h-full bg-zinc-950 overflow-y-auto no-scrollbar scroll-smooth">
                            {/* Header Image Placeholder */}
                            <div
                                className="h-40 bg-zinc-800 relative bg-cover bg-center"
                                style={{
                                    backgroundImage: formData.banner_url ? `url(${formData.banner_url})` : 'linear-gradient(to bottom right, #27272a, #18181b)'
                                }}
                            >
                                {/* Overlay for text readability */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                                <div className="absolute bottom-[-20px] left-4 w-20 h-20 bg-zinc-950 rounded-full p-1 z-20 group cursor-pointer">
                                    <Label htmlFor="logo-upload" className="cursor-pointer">
                                        <div className="w-full h-full bg-zinc-800 rounded-full flex items-center justify-center text-xs text-zinc-500 overflow-hidden relative border-2 border-transparent group-hover:border-[#ccff00] transition-colors">
                                            {formData.logo_url ? (
                                                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <span>Logo</span>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-[8px] text-white">Cambiar</span>
                                            </div>
                                        </div>
                                    </Label>
                                    <Input
                                        id="logo-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e, 'logo_url')}
                                        disabled={uploading}
                                    />
                                </div>

                                <div className="absolute top-2 right-2 z-20">
                                    <Label htmlFor="banner-upload" className="cursor-pointer">
                                        <div className="bg-black/50 hover:bg-black/70 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm border border-white/10 flex items-center gap-1 transition-colors">
                                            <CheckCircle2 className="w-3 h-3 text-[#ccff00]" />
                                            <span>Editar Portada <span className="text-[9px] opacity-70">(Max 5MB)</span></span>
                                        </div>
                                    </Label>
                                    <Input
                                        id="banner-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleImageUpload(e, 'banner_url')}
                                        disabled={uploading}
                                    />
                                </div>
                            </div>

                            {/* Inputs hidden/moved above into the banner container */}


                            {/* Content */}
                            <div className="pt-2 px-5 space-y-4">
                                {/* Text starts BELOW the logo overlap area */}
                                <div className="relative z-20 mt-16 px-1">
                                    <h2 className="text-xl font-bold text-white leading-tight drop-shadow-md break-words">
                                        {formData.name || 'Nombre del Club'}
                                    </h2>
                                    <div className="flex items-center gap-2 text-xs text-zinc-200 mt-2 drop-shadow-sm font-medium">
                                        <MapPin className="w-3 h-3 text-[#ccff00] shrink-0" />
                                        <span className="truncate max-w-[200px]">{formData.address || 'Ubicación...'}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <span className="text-[10px] bg-[#ccff00]/10 text-[#ccff00] px-2 py-1 rounded-full border border-[#ccff00]/20">
                                        Padel
                                    </span>
                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">
                                        Cafetería
                                    </span>
                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded-full">
                                        Parking
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-white">Sobre nosotros</h3>
                                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-6">
                                        {formData.description || 'Aquí aparecerá la descripción de tu club. Es tu oportunidad para conectar con los jugadores y contarles qué hace especial a tus instalaciones.'}
                                    </p>
                                </div>

                                {/* Contact Chips */}
                                <div className="space-y-2 pt-2">
                                    {formData.phone && (
                                        <div className="flex items-center gap-3 text-xs text-zinc-300 bg-zinc-900 p-2 rounded-lg">
                                            <Phone className="w-4 h-4 text-[#ccff00]" />
                                            {formData.phone}
                                        </div>
                                    )}
                                    {formData.email && (
                                        <div className="flex items-center gap-3 text-xs text-zinc-300 bg-zinc-900 p-2 rounded-lg">
                                            <Mail className="w-4 h-4 text-[#ccff00]" />
                                            {formData.email}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4">
                                    <div className="w-full bg-[#ccff00] text-black text-center py-3 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(204,255,0,0.3)]">
                                        Reservar Pista
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
