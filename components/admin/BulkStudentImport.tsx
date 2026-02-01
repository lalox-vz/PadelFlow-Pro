"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Assuming you have these or use standard divs

export default function BulkStudentImport() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/import-students", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            setResult(data);
        } catch (error) {
            console.error("Upload failed", error);
            setResult({ error: "Upload failed" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="w-full max-w-md mx-auto mt-8">
            <CardHeader>
                <CardTitle>Importar Alumnos (Excel)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Input id="excel-file" type="file" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                </div>
                <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
                    {uploading ? "Importando..." : "Subir y Procesar"}
                </Button>

                {result && (
                    <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
                        {result.error && <p className="text-red-500 font-bold">Error: {result.error}</p>}
                        {result.success && (
                            <div>
                                <p className="font-bold text-green-600">Proceso Completado</p>
                                <p>Creados: {result.results?.length}</p>
                                <p>Errores: {result.errors?.length}</p>
                                {result.errors?.length > 0 && (
                                    <ul className="mt-2 text-red-500 list-disc pl-4">
                                        {result.errors.slice(0, 5).map((e: any, i: number) => (
                                            <li key={i}>{e.email}: {e.error}</li>
                                        ))}
                                        {result.errors.length > 5 && <li>...y {result.errors.length - 5} más</li>}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
