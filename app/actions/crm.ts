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
