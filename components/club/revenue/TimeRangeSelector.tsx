"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown, X } from "lucide-react"
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, endOfYear } from "date-fns"
import { es } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

interface TimeRangeSelectorProps {
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    period: string
    setPeriod: (period: string) => void
    onRangeChange: (start: Date, end: Date) => void
}

// Quick presets - clean and professional
const PRESETS = [
    { label: "Este Mes", value: "this_month" },
    { label: "Mes Pasado", value: "last_month" },
    { label: "Últimos 3 Meses", value: "last_3_months" },
    { label: "Últimos 6 Meses", value: "last_6_months" },
    { label: "Este Año", value: "this_year" },
]

export function TimeRangeSelector({ date, setDate, period, setPeriod, onRangeChange }: TimeRangeSelectorProps) {
    const [dropdownOpen, setDropdownOpen] = React.useState(false)
    const [customDialogOpen, setCustomDialogOpen] = React.useState(false)
    const [tempRange, setTempRange] = React.useState<DateRange | undefined>(date)

    const handlePresetSelect = (value: string) => {
        if (value === "custom") {
            setDropdownOpen(false)
            setTempRange(date) // Initialize with current selection
            setCustomDialogOpen(true)
            return
        }

        setPeriod(value)
        const now = new Date()
        let start = now
        let end = now

        switch (value) {
            case "this_month":
                start = startOfMonth(now)
                end = endOfMonth(now)
                break
            case "last_month":
                const lastMonth = subMonths(now, 1)
                start = startOfMonth(lastMonth)
                end = endOfMonth(lastMonth)
                break
            case "last_3_months":
                start = startOfMonth(subMonths(now, 2))
                end = endOfMonth(now)
                break
            case "last_6_months":
                start = startOfMonth(subMonths(now, 5))
                end = endOfMonth(now)
                break
            case "this_year":
                start = startOfYear(now)
                end = endOfYear(now)
                break
        }

        setDate({ from: start, to: end })
        onRangeChange(start, end)
        setDropdownOpen(false)
    }

    const handleApplyCustomRange = () => {
        if (tempRange?.from && tempRange?.to) {
            setPeriod("custom")
            setDate(tempRange)
            onRangeChange(tempRange.from, tempRange.to)
            setCustomDialogOpen(false)
        }
    }

    // Calculate days in current selection
    const getDaysCount = () => {
        if (!date?.from || !date?.to) return 0
        return Math.round((date.to.getTime() - date.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    }

    // Get display label based on current selection
    const getDisplayLabel = () => {
        const preset = PRESETS.find(p => p.value === period)
        if (preset) return preset.label
        if (date?.from && date?.to) {
            return `${format(date.from, "d MMM", { locale: es })} - ${format(date.to, "d MMM yyyy", { locale: es })}`
        }
        return "Seleccionar periodo"
    }

    return (
        <>
            {/* Main Dropdown */}
            <Popover open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "min-w-[180px] justify-between text-left font-normal bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:border-zinc-700",
                            !date && "text-zinc-500"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-[#ccff00]" />
                            <span className="truncate">{getDisplayLabel()}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[200px] p-1 bg-zinc-950 border-zinc-800"
                    align="start"
                    sideOffset={4}
                >
                    {/* Preset Options */}
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.value}
                            onClick={() => handlePresetSelect(preset.value)}
                            className={cn(
                                "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                                period === preset.value
                                    ? "bg-[#ccff00]/20 text-[#ccff00]"
                                    : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                            )}
                        >
                            {preset.label}
                        </button>
                    ))}

                    {/* Divider */}
                    <div className="border-t border-zinc-800 my-1" />

                    {/* Custom Option */}
                    <button
                        onClick={() => handlePresetSelect("custom")}
                        className={cn(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                            period === "custom"
                                ? "bg-[#ccff00]/20 text-[#ccff00]"
                                : "text-zinc-300 hover:bg-zinc-800/50 hover:text-white"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>Personalizado...</span>
                        </div>
                    </button>
                </PopoverContent>
            </Popover>

            {/* Custom Date Range Dialog */}
            <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-fit">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Seleccionar Rango de Fechas</DialogTitle>
                    </DialogHeader>

                    <div className="py-4">
                        {/* Date Display */}
                        <div className="flex items-center gap-4 mb-4 px-2">
                            <div className="flex-1 text-center">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Desde</p>
                                <p className="text-lg font-medium text-[#ccff00]">
                                    {tempRange?.from ? format(tempRange.from, "d MMM yyyy", { locale: es }) : "—"}
                                </p>
                            </div>
                            <div className="text-zinc-600">→</div>
                            <div className="flex-1 text-center">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Hasta</p>
                                <p className="text-lg font-medium text-[#ccff00]">
                                    {tempRange?.to ? format(tempRange.to, "d MMM yyyy", { locale: es }) : "—"}
                                </p>
                            </div>
                        </div>

                        {/* Days Counter */}
                        {tempRange?.from && tempRange?.to && (
                            <div className="text-center mb-4">
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-800 text-xs text-zinc-400">
                                    {Math.round((tempRange.to.getTime() - tempRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} días seleccionados
                                </span>
                            </div>
                        )}

                        {/* Calendar */}
                        <Calendar
                            mode="range"
                            defaultMonth={tempRange?.from || new Date()}
                            selected={tempRange}
                            onSelect={setTempRange}
                            numberOfMonths={2}
                            className="bg-zinc-950 text-white rounded-lg"
                            classNames={{
                                months: "flex gap-4",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center",
                                caption_label: "text-sm font-medium",
                                nav: "space-x-1 flex items-center",
                                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-zinc-800 rounded",
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse",
                                head_row: "flex",
                                head_cell: "text-zinc-500 rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2",
                                cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-zinc-800 rounded-md transition-colors",
                                day_selected: "bg-[#ccff00] text-black hover:bg-[#ccff00] hover:text-black focus:bg-[#ccff00] focus:text-black",
                                day_today: "bg-zinc-800 text-white",
                                day_outside: "text-zinc-600 opacity-50",
                                day_disabled: "text-zinc-600 opacity-50",
                                day_range_middle: "aria-selected:bg-[#ccff00]/20 aria-selected:text-white rounded-none",
                                day_range_start: "rounded-l-md",
                                day_range_end: "rounded-r-md",
                                day_hidden: "invisible",
                            }}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setCustomDialogOpen(false)}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleApplyCustomRange}
                            disabled={!tempRange?.from || !tempRange?.to}
                            className="bg-[#ccff00] text-black hover:bg-[#ccff00]/90 disabled:opacity-50"
                        >
                            Aplicar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
