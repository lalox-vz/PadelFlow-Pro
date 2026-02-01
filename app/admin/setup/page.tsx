"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client"; // Adjust path if needed
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AcademyOnboarding() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        location: "",
        totalCourts: "1",
        openingTime: "08:00",
        closingTime: "22:00",
    });

    const supabase = createClient();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            // 2. Create Organization
            const { data: org, error: orgError } = await supabase
                .from("organizations")
                .insert({
                    name: formData.name,
                    location: formData.location,
                    total_courts: parseInt(formData.totalCourts),
                    opening_time: formData.openingTime,
                    closing_time: formData.closingTime,
                })
                .select()
                .single();

            if (orgError) throw orgError;

            // 3. Update User with Organization ID and Role
            const { error: userError } = await supabase
                .from("users")
                .update({
                    organization_id: org.id,
                    role: "owner",
                })
                .eq("id", user.id);

            if (userError) throw userError;

            // 4. Generate Courts automatically
            const courts = Array.from({ length: parseInt(formData.totalCourts) }).map((_, i) => ({
                organization_id: org.id,
                court_name: `Cancha ${i + 1}`,
                surface_type: "outdoor", // Default
            }));

            const { error: courtsError } = await supabase
                .from("courts")
                .insert(courts);

            if (courtsError) throw courtsError;

            alert("Academy Setup Complete!");
            router.push("/admin/dashboard"); // Redirect to dashboard
        } catch (error: any) {
            console.error("Setup failed:", error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Configura tu Academia</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre de la Academia</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Ej. Padel Club Madrid"
                                required
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Ubicación</Label>
                            <Input
                                id="location"
                                name="location"
                                placeholder="Ej. Calle Principal 123"
                                required
                                value={formData.location}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="totalCourts">Número de Canchas</Label>
                                <Input
                                    id="totalCourts"
                                    name="totalCourts"
                                    type="number"
                                    min="1"
                                    required
                                    value={formData.totalCourts}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Superficie Predeterminada</Label>
                                <Select disabled defaultValue="outdoor">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Outdoor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="outdoor">Outdoor</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="openingTime">Apertura</Label>
                                <Input
                                    id="openingTime"
                                    name="openingTime"
                                    type="time"
                                    required
                                    value={formData.openingTime}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="closingTime">Cierre</Label>
                                <Input
                                    id="closingTime"
                                    name="closingTime"
                                    type="time"
                                    required
                                    value={formData.closingTime}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Configurando..." : "Crear Academia y Canchas"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
