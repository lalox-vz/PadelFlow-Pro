"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

export interface Workspace {
    entity_id: string
    workspace_type: 'CLUB' | 'ACADEMY'
    workspace_name: string
    host_club_id?: string | null
    host_club_name?: string | null
}

interface WorkspaceContextType {
    workspaces: Workspace[]
    activeWorkspace: Workspace | null
    setActiveWorkspace: (workspace: Workspace) => void
    loading: boolean
    isIntegratedOwner: boolean // Owns both club and academy
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null)
    const [loading, setLoading] = useState(true)

    // Fetch all workspaces owned by user
    useEffect(() => {
        const fetchWorkspaces = async () => {
            if (!user) {
                setWorkspaces([])
                setActiveWorkspaceState(null)
                setLoading(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from('user_workspaces')
                    .select('*')
                    .order('workspace_type', { ascending: true }) // Clubs first, then academies

                if (error) throw error

                setWorkspaces(data || [])

                // Set active workspace from localStorage or default to first
                const savedWorkspaceId = localStorage.getItem('activeWorkspaceId')
                const savedWorkspace = data?.find(w => w.entity_id === savedWorkspaceId)

                if (savedWorkspace) {
                    setActiveWorkspaceState(savedWorkspace)
                } else if (data && data.length > 0) {
                    setActiveWorkspaceState(data[0])
                }
            } catch (error) {
                console.error('Error fetching workspaces:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchWorkspaces()
    }, [user])

    const setActiveWorkspace = (workspace: Workspace) => {
        setActiveWorkspaceState(workspace)
        localStorage.setItem('activeWorkspaceId', workspace.entity_id)

        // Reload page to update dashboard context
        window.location.reload()
    }

    const isIntegratedOwner = workspaces.length > 1

    return (
        <WorkspaceContext.Provider
            value={{
                workspaces,
                activeWorkspace,
                setActiveWorkspace,
                loading,
                isIntegratedOwner
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    )
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext)
    if (context === undefined) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider')
    }
    return context
}
