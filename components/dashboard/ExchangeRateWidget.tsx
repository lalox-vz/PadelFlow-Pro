"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function ExchangeRateWidget() {
    const [rate, setRate] = useState<string>('400')
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        fetchRate()
    }, [])

    const fetchRate = async () => {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'exchange_rate')
            .single()

        if (data?.value) {
            setRate(String(data.value))
        }
    }

    const updateRate = async () => {
        setLoading(true)
        try {
            // Upsert mechanism
            const { error } = await supabase
                .from('app_settings')
                .upsert({
                    key: 'exchange_rate',
                    value: rate,
                    updated_at: new Date().toISOString()
                })

            if (error) throw error

            toast({
                title: "Tasa actualizada",
                description: `La tasa del día es ahora ${rate} Bs/$`,
            })
        } catch (err) {
            console.error(err)
            toast({
                title: "Error",
                description: "No se pudo actualizar la tasa",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="bg-slate-900 text-white border-0 shadow-lg">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="bg-green-500/20 p-2 rounded-full">
                        <DollarSign className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tasa del Día (Bs/$)</p>
                        <p className="text-xs text-slate-500">Global para usuarios y admin</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Input
                        type="number"
                        value={rate}
                        onChange={(e) => setRate(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white w-full sm:w-32 text-center font-bold"
                    />
                    <Button
                        size="sm"
                        onClick={updateRate}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Actualizar"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
