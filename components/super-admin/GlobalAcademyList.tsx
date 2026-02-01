"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SwitchAcademyButton from "@/components/super-admin/SwitchAcademyButton";

export default function GlobalAcademyList() {
    const [academies, setAcademies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchAcademies() {
            // Thanks to Super Admin RLS, this should return ALL organizations
            const { data, error } = await supabase
                .from("organizations")
                .select(`
          *,
          users (count),
          courts (count)
        `);

            if (error) {
                console.error("Error fetching academies:", error);
            } else {
                setAcademies(data || []);
            }
            setLoading(false);
        }

        fetchAcademies();
    }, []);

    if (loading) return <div>Loading Global Data...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registered Academies ({academies.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Courts</TableHead>
                            <TableHead>Users</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {academies.map((org) => (
                            <TableRow key={org.id}>
                                <TableCell className="font-medium">{org.name}</TableCell>
                                <TableCell>{org.location}</TableCell>
                                <TableCell>{org.courts[0]?.count || 0}</TableCell>
                                <TableCell>{org.users[0]?.count || 0}</TableCell>
                                <TableCell>
                                    <SwitchAcademyButton organizationId={org.id} name={org.name} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
