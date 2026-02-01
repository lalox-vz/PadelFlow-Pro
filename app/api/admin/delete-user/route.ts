import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { userId } = await request.json()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceRoleKey) {
            console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
            return NextResponse.json({ error: 'Server Configuration Error: Missing Service Role Key. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local' }, { status: 500 })
        }

        // Initialize Supabase Admin Client dynamically to ensure env vars are picked up
        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Delete the user from Supabase Auth
        // Because of the ON DELETE CASCADE SQL we added, this will automatically
        // remove the user from 'public.users', 'registrations', 'payments', etc.
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) {
            console.error('Error deleting user from Auth:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'User deleted successfully' })
    } catch (error: any) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error', details: JSON.stringify(error) }, { status: 500 })
    }
}
