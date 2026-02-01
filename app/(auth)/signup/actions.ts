"use server"

import { createClient } from "@/utils/supabase/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function signupAction(prevState: any, formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string

    const cleanEmail = email?.trim()
    const cleanPassword = password?.trim()
    const cleanFullName = fullName?.trim()

    try {
        const isBusinessSignup = formData.get("isBusinessSignup") === 'true'

        // 1. Create user via Admin API to skip email confirmation (Auto-confirm)
        const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: cleanPassword,
            email_confirm: true, // <--- This is the magic key
            user_metadata: {
                full_name: cleanFullName,
                role: isBusinessSignup ? 'owner' : 'client', // Default role based on intent
                signup_intent: isBusinessSignup ? 'business' : 'player'
            }
        })

        if (adminError) {
            console.error("Admin Create Error:", adminError)
            return { error: adminError.message }
        }

        if (!adminData.user) {
            return { error: "User creation failed unexpectedly." }
        }

        // 2. Sign in immediately to set the session cookies
        const supabase = await createClient()
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword
        })

        if (signInError) {
            console.error("Auto-SignIn Error:", signInError)
            return { error: signInError.message }
        }

        // 3. Explicitly update the users table with the correct role
        // This is CRITICAL because the trigger might default to 'client' or be slow
        // and we need to guarantee the role is set for the immediate redirect/middleware checks.
        const roleToSet = isBusinessSignup ? 'owner' : 'client'

        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ role: roleToSet })
            .eq('id', adminData.user.id)

        if (updateError) {
            console.error("Failed to set user role in DB:", updateError)
            // We don't block signup success but warn about it
        }

        return { success: true, isBusinessSignup }

    } catch (err: any) {
        console.error("Server Action Exception:", err)
        return { error: err.message || "Unknown error" }
    }
}
