"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { startOfMonth, endOfMonth } from "date-fns"

export type CreateBookingParams = {
    courtId: string
    startTime: Date
    endTime: Date
    name: string // Title or Member Name
    isPaid: boolean
    price: number
    userId?: string | null // App User ID
    phone?: string // Contact for Manual/Guest
    email?: string // Contact for Manual/Guest
    entityId: string // Organization
    description?: string
}

export type UpdateBookingParams = {
    bookingId: string
    name?: string
    isPaid?: boolean
    startTime?: Date
    endTime?: Date
    courtId?: string
    totalPrice?: number
    participant_checkin?: boolean
    entityId: string
}

/**
 * Creates a booking with World Class integrity.
 * 1. Upserts 'club_members' for manual guests if phone is present.
 * 2. Creates the 'bookings' record linked to the app user or the manual member logic.
 * 3. Enforces data consistency.
 */
export async function createBookingAction(params: CreateBookingParams) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    const {
        entityId,
        courtId,
        startTime,
        endTime,
        name,
        userId,
        phone,
        email,
        isPaid,
        price,
        description
    } = params

    // Use a mutable variable for description logic
    let finalDescription = description

    // NEW: Capture the resolved Member ID to link the booking strictly
    let finalMemberId: string | null = null

    // Initialize variables used in the CRM logic block
    let bookingMetadata: {
        alt_contact?: string,
        contact_mismatch?: boolean,
        alt_email?: string,
        email_mismatch?: boolean
    } = {}
    let phoneMismatchWarning: boolean = false
    let emailMismatchWarning: boolean = false

    try {
        // 2. CRM LOGIC: USER PROTECTION & INTEGRITY PROTOCOL
        if (userId || phone || name) {
            let existingMember = null

            // A. Identity Discovery (Cascading Lookup)
            // 1. App User ID (Strongest link)
            if (userId) {
                const { data } = await supabase.from('club_members').select('*').eq('entity_id', entityId).eq('user_id', userId).maybeSingle()
                existingMember = data
            }

            // 2. Phone (Unique Contact) - Only if not found yet
            if (!existingMember && phone) {
                const { data } = await supabase.from('club_members').select('*').eq('entity_id', entityId).eq('phone', phone).maybeSingle()
                existingMember = data
            }

            // 3. Name (Manual Fallback) - If no ID and no Phone match, try matching by Name to enrich
            if (!existingMember && !userId && name) {
                const { data } = await supabase.from('club_members').select('*').eq('entity_id', entityId).ilike('full_name', name).maybeSingle()
                existingMember = data
            }

            // B. Action Execution
            if (existingMember) {
                finalMemberId = existingMember.id // CAPTURE ID
                if (existingMember.user_id) {
                    // --- CASE 1: APP USER (PROTECTED) ---
                    // We NEVER overwrite their profile phone/email from a manual booking form.

                    // "The Girlfriend Scenario": Check for phone mismatch
                    if (phone && existingMember.phone !== phone) {
                        bookingMetadata.alt_contact = phone
                        bookingMetadata.contact_mismatch = true
                        phoneMismatchWarning = true

                        const contactNote = `Contacto Reserva: ${phone}`
                        finalDescription = finalDescription ? `${finalDescription} | ${contactNote}` : contactNote
                    }

                    // Email Protection Scenario
                    if (email && existingMember.email !== email) {
                        bookingMetadata.alt_email = email
                        bookingMetadata.email_mismatch = true
                        emailMismatchWarning = true
                        // We don't append email to description to avoid clutter, metadata is sufficient
                    }

                    // Touch presence
                    await supabase.from('club_members').update({
                        last_interaction_at: new Date().toISOString()
                    }).eq('id', existingMember.id)

                } else {
                    // --- CASE 2: MANUAL MEMBER (ENRICHMENT) ---
                    // Found an existing manual profile (by Phone or Name).
                    // We UPDATE it with the new info (Enrichment).

                    const updatePayload: any = {
                        last_interaction_at: new Date().toISOString()
                    }
                    // Always enrich phone if provided and different
                    if (phone && existingMember.phone !== phone) {
                        updatePayload.phone = phone
                    }
                    if (email && existingMember.email !== email) {
                        updatePayload.email = email
                    }
                    // Capture User ID if they decided to link app account now? 
                    // (Strictly if passed and mismatching null, but usually userId lookup handles this. 
                    // If we reached here, userId param is likely null or mismatch).
                    if (userId && !existingMember.user_id) updatePayload.user_id = userId

                    await supabase.from('club_members').update(updatePayload).eq('id', existingMember.id)
                }
            } else {
                // --- CASE 3: NEW MEMBER (CREATION) ---
                // No match found by ID, Phone, or Name. Create fresh.

                const memberPayload: any = {
                    entity_id: entityId,
                    full_name: name,
                    status: 'active',
                    last_interaction_at: new Date().toISOString()
                }
                if (phone) memberPayload.phone = phone
                if (email) memberPayload.email = email
                if (userId) memberPayload.user_id = userId

                // We use Upsert just in case of race conditions, but essentially insert
                let memberQuery;
                if (phone) {
                    memberQuery = supabase.from('club_members').upsert(memberPayload, { onConflict: 'entity_id, phone' }).select().single()
                } else if (userId) {
                    memberQuery = supabase.from('club_members').upsert(memberPayload, { onConflict: 'entity_id, user_id' }).select().single()
                } else {
                    // Name only insert
                    memberQuery = supabase.from('club_members').insert(memberPayload).select().single()
                }

                const { data: newMember, error: memberError } = await memberQuery
                if (memberError) {
                    console.error("Critical: Failed to create manual member", memberError)
                    throw new Error(`No se pudo crear el perfil del cliente: ${memberError.message}`)
                }

                if (newMember) {
                    finalMemberId = newMember.id // CAPTURE NEW ID
                }
            }
        }

        // 2. CREATE BOOKING
        // Manual User Phone Fallback: If it's a manual user and we have a phone, ensure it's visible in description too
        // (Just in case the calendar UI needs it quickly without joining)
        if (phone && !userId && (!finalDescription || !finalDescription.includes(phone))) {
            finalDescription = finalDescription ? `${finalDescription} | Tel: ${phone}` : `Tel: ${phone}`
        }

        const { data, error } = await supabase
            .from('bookings')
            .insert({
                entity_id: entityId,
                court_id: courtId,
                start_time: startTime,
                end_time: endTime,
                title: name,
                description: finalDescription, // Use the potentially enriched description
                payment_status: isPaid ? 'paid' : 'pending',
                user_id: userId || null,
                member_id: finalMemberId || null, // 🛡️ LINK INTEGRITY: Saving the real CRM ID
                price: price,
                metadata: bookingMetadata // Bank-Grade Security: Audit Trail & Mismatches
            })
            .select()
            .single()

        if (error) throw error

        // 3. REVALIDATE
        revalidatePath('/club/calendar')
        revalidatePath('/club/dashboard')

        return {
            success: true,
            data,
            warnings: {
                phone_mismatch: phoneMismatchWarning,
                email_mismatch: emailMismatchWarning
            }
        }
    } catch (error: any) {
        console.error("Booking Creation Failed:", error)
        return { success: false, error: error.message }
    }
}


export async function updateBookingAction(params: UpdateBookingParams) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    try {
        const payload: any = {}
        if (params.name !== undefined) payload.title = params.name
        if (params.isPaid !== undefined) payload.payment_status = params.isPaid ? 'paid' : 'pending'
        if (params.courtId !== undefined) payload.court_id = params.courtId
        if (params.startTime !== undefined) payload.start_time = params.startTime
        if (params.endTime !== undefined) payload.end_time = params.endTime
        if (params.participant_checkin !== undefined) payload.participant_checkin = params.participant_checkin

        // BUG 2 FIX: Integrity check for Recurring Plans.
        // We must NOT overwrite the price of a Contract Booking (Recurring).
        // The price is fixed/overridden by the plan.

        // 1. Check if booking is linked to a plan
        const { data: existing } = await supabase.from('bookings').select('recurring_plan_id, price').eq('id', params.bookingId).single()

        if (params.totalPrice !== undefined) {
            // Only update price if it's NOT a recurring plan booking
            if (!existing?.recurring_plan_id) {
                payload.price = params.totalPrice
            } else {
                // It is recurring. Ignore the incoming price override from the UI (which might vary depending on pricing rules)
                // We trust the original price (existing.price) or simply Do Nothing to 'price' column.
            }
        }

        const { error } = await supabase
            .from('bookings')
            .update(payload)
            .eq('id', params.bookingId)
        // .eq('entity_id', params.entityId) // Security check ideally

        if (error) throw error

        revalidatePath('/club/calendar')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteBookingAction(bookingId: string) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
            },
        }
    )

    try {
        const { error } = await supabase
            .from('bookings')
            .update({ payment_status: 'canceled' })
            .eq('id', bookingId)

        if (error) throw error
        revalidatePath('/club/calendar')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
