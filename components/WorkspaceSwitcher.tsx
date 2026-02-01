"use client"

import { useWorkspace } from "@/context/WorkspaceContext"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Building2, GraduationCap, ChevronDown, Check } from "lucide-react"
import { Badge } from "./ui/badge"

export function WorkspaceSwitcher() {
    const { workspaces, activeWorkspace, setActiveWorkspace, isIntegratedOwner, loading } = useWorkspace()

    if (loading || !activeWorkspace) return null

    // Don't show switcher if user only has one workspace
    if (!isIntegratedOwner) return null

    const getWorkspaceIcon = (type: 'CLUB' | 'ACADEMY') => {
        return type === 'CLUB' ? (
            <Building2 className="h-4 w-4" />
        ) : (
            <GraduationCap className="h-4 w-4" />
        )
    }

    const getWorkspaceBadge = (type: 'CLUB' | 'ACADEMY') => {
        return type === 'CLUB' ? (
            <Badge variant="default" className="ml-2 bg-blue-500">Club</Badge>
        ) : (
            <Badge variant="secondary" className="ml-2 bg-purple-500">Academia</Badge>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="flex items-center gap-2 min-w-[200px] justify-between border-2 hover:border-[#ccff00] transition-colors"
                >
                    <div className="flex items-center gap-2">
                        {getWorkspaceIcon(activeWorkspace.workspace_type)}
                        <span className="font-semibold truncate max-w-[150px]">
                            {activeWorkspace.workspace_name}
                        </span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px]">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Cambiar Espacio</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            Gestiona tus negocios
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {workspaces.map((workspace) => (
                    <DropdownMenuItem
                        key={workspace.entity_id}
                        onClick={() => setActiveWorkspace(workspace)}
                        className={`flex items-center justify-between cursor-pointer ${workspace.entity_id === activeWorkspace.entity_id
                            ? 'bg-accent'
                            : ''
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            {getWorkspaceIcon(workspace.workspace_type)}
                            <div className="flex flex-col">
                                <span className="font-medium">{workspace.workspace_name}</span>
                                {workspace.workspace_type === 'ACADEMY' && workspace.host_club_name && (
                                    <span className="text-xs text-muted-foreground">
                                        en {workspace.host_club_name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {getWorkspaceBadge(workspace.workspace_type)}
                            {workspace.entity_id === activeWorkspace.entity_id && (
                                <Check className="h-4 w-4 text-[#ccff00]" />
                            )}
                        </div>
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer font-medium text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 dark:focus:bg-emerald-950/30">
                    <a href="/register-business" className="flex items-center gap-2 w-full">
                        <span className="text-lg leading-none pb-0.5">+</span>
                        Crear nuevo Club o Academia
                    </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                    💡 Tip: Cada espacio tiene su propio panel
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
