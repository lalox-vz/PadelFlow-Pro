"use client"

import { Button } from "@/components/ui/button"
import { Calendar, List, LayoutGrid } from "lucide-react"
import { cn } from "@/lib/utils"

import { useLanguage } from "@/context/LanguageContext"

export type ViewType = 'calendar' | 'list' | 'grid'

interface ViewToggleProps {
    currentView: ViewType
    onViewChange: (view: ViewType) => void
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
    const { t } = useLanguage()

    return (
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange('calendar')}
                className={cn(
                    "flex-1 h-8 rounded-md transition-all",
                    currentView === 'calendar' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
                title={t.view_options.calendar}
            >
                <Calendar className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t.view_options.calendar}</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange('list')}
                className={cn(
                    "flex-1 h-8 rounded-md transition-all",
                    currentView === 'list' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
                title={t.view_options.list}
            >
                <List className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t.view_options.list}</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewChange('grid')}
                className={cn(
                    "flex-1 h-8 rounded-md transition-all",
                    currentView === 'grid' ? "bg-white shadow text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
                title={t.view_options.grid}
            >
                <LayoutGrid className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t.view_options.grid}</span>
            </Button>
        </div>
    )
}
