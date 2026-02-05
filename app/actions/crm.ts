'use server'

import { createClient } from "@/utils/supabase/server"

export type MemberResult = {
    id: string
    user_id: string | null
    full_name: string
    phone: string | null
    email: string | null
    source: string
}

export async function searchClubMembers(query: string): Promise<MemberResult[]> {
    if (!query || query.length < 2) return []

    const supabase = await createClient()

    // Clean the query for phone search (numbers only)
    const phoneQuery = query.replace(/\D/g, '')

    let dbQuery = supabase
        .from('club_members')
        .select('id, user_id, full_name, phone, email, metadata')
        .eq('entity_id', '70e8610d-2c9b-403f-bfd2-21a279251b1b') // Verified Entity ID
        .limit(10)

    // Smart Filter: If it looks like a phone, search phone. Else name.
    if (phoneQuery.length > 4) {
        dbQuery = dbQuery.or(`full_name.ilike.%${query}%,phone.ilike.%${phoneQuery}%`)
    } else {
        dbQuery = dbQuery.ilike('full_name', `%${query}%`)
    }

    const { data, error } = await dbQuery

    if (error) {
        console.error('Error searching members:', error)
        return []
    }

    return data.map(member => ({
        id: member.id,
        user_id: member.user_id,
        full_name: member.full_name,
        phone: member.phone,
        email: member.email,
        source: member.user_id ? 'App' : 'Club'
    }))
}

export async function createClubMember(entityId: string, name: string, phone?: string | null): Promise<MemberResult> {
    const supabase = await createClient()

    // 1. Check duplicates by Phone (if provided)
    if (phone) {
        const { data: existing } = await supabase
            .from('club_members')
            .select('*')
            .eq('entity_id', entityId)
            .eq('phone', phone)
            .maybeSingle()

        if (existing) {
            return existing
        }
    }

    // 2. Check duplicates by Name (Exact match to avoid ghosts)
    const { data: existingName } = await supabase
        .from('club_members')
        .select('*')
        .eq('entity_id', entityId)
        .ilike('full_name', name)
        .maybeSingle()

    if (existingName) return existingName

    // 3. Create
    const { data, error } = await supabase.from('club_members').insert({
        entity_id: entityId,
        full_name: name,
        phone: phone || null,
        status: 'active',
        // 'role' column does not exist in club_members. Using metadata instead.
        notes: 'Creado desde Modal de Planes Fijos',
        metadata: { is_fixed: true, source: 'manual_creation' }
    }).select().single()

    if (error) {
        console.error("Create member error:", error)
        throw new Error("No se pudo crear el socio.")
    }

    return {
        id: data.id,
        user_id: data.user_id,
        full_name: data.full_name,
        phone: data.phone,
        email: data.email,
        source: 'Club'
    }
}
