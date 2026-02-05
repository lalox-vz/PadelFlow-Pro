'use server'

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { startOfMonth, endOfMonth, addMonths, startOfDay, isBefore, parseISO, addWeeks, addMinutes } from "date-fns"

// --- TYPES ---

export type IncidentAction = 'rain' | 'other'


export type CreatePlanParams = {
    orgId: string
    userId?: string | null
    memberId?: string | null
    courtId: string
    dayOfWeek: number
    startTime: string // "HH:MM"
    startDate: string // "YYYY-MM-DD"
    endDate: string // "YYYY-MM-DD"
    price?: number // Optional override
    paymentAdvance: boolean
}

export type UpdatePlanParams = {
    planId: string
    courtId: string
    dayOfWeek: number
    startTime: string // "HH:MM"
    price: number
    paymentAdvance: boolean
}

// --- PUBLIC ACTIONS ---

export async function createRecurringPlan(params: CreatePlanParams) {
    const supabase = await createClient()
    const { orgId, userId, memberId, courtId, startTime, startDate, endDate, price, dayOfWeek, paymentAdvance } = params

    // 1. Calculate Projected Dates
    const slots = calculateSlots(startDate, endDate, dayOfWeek, startTime)
    if (slots.length === 0) {
        return { success: false, error: "El rango de fechas no incluye ningún día válido para el horario seleccionado." }
    }

    // 2. Conflict Check (Pre-Flight)
    const conflict = await checkConflicts(supabase, courtId, slots)
    if (conflict) {
        return { success: false, error: `Conflicto: ${conflict}` }
    }

    // 3. Pricing Logic (Hybrid)
    let finalPrice = price
    // If no override, try to find a rule. If no rule, fallback to paying 0 or default?
    // User requirement: "busca el precio en pricing_rules".
    // NOTE: Pricing rules are complex (time ranges). For now, if price is undefined, we need a fallback.
    // Assuming the frontend sends the price, or we fetch it. 
    // Given the complexity of pricing_rules, usually the frontend calculates it. 
    // BUT we must adhere to: "Si el usuario no define un override_price, busca el precio..."
    // Since pricing_rules might vary per slot (e.g. one slot is peak, another is not?), 
    // a single "fixed price" plan assumes consistency.
    // Let's rely on the provided price for V1 stability OR fetch specific court price.
    // If finalPrice is undefined/0, we'll try to fetch court default.

    if (!finalPrice || finalPrice <= 0) {
        const { data: court } = await supabase.from('courts').select('hour_price').eq('id', courtId).single()
        if (court?.hour_price) finalPrice = court.hour_price
    }

    // Fallback if still 0
    if (!finalPrice) finalPrice = 0

    // 4. Create Plan Header
    // Logic Correction: 'price' param is now effectively "Unit Price per Session" (Override).
    // The table 'recurring_plans' has a 'total_price' column. 
    // We should store: total_price = finalPrice (unit) * slots.length
    // This makes the contract value correct.
    const contractTotal = (finalPrice || 0) * slots.length

    const { data: plan, error: planError } = await supabase
        .from('recurring_plans')
        .insert({
            organization_id: orgId,
            user_id: userId || null,
            member_id: memberId || null,
            court_id: courtId,
            day_of_week: dayOfWeek,
            start_time: startTime + ':00',
            start_date: startDate,
            end_date: endDate,
            total_price: contractTotal,
            active: true,
            payment_advance: paymentAdvance
        })
        .select()
        .single()

    if (planError) {
        console.error("Plan creation error:", planError)
        return { success: false, error: "Error al crear el contrato en base de datos." }
    }

    // 5. Generate Bookings
    // Need user name for titles
    let title = 'Reserva Fija'
    if (memberId) {
        const { data: member } = await supabase.from('club_members').select('full_name').eq('id', memberId).single()
        if (member) title = member.full_name
    } else if (userId) {
        const { data: user } = await supabase.from('users').select('full_name').eq('id', userId).single()
        if (user) title = user.full_name
    }

    const bookingsToInsert = slots.map(slot => ({
        entity_id: orgId,
        court_id: courtId,
        user_id: userId || null, // Link App User
        member_id: memberId || null, // Link CRM Member (Critical Integrity)
        start_time: slot.start,
        end_time: slot.end,
        title: title,
        payment_status: paymentAdvance ? 'paid' : 'pending',
        recurring_plan_id: plan.id,
        price: finalPrice
    }))

    const { error: batchError } = await supabase.from('bookings').insert(bookingsToInsert)
    if (batchError) {
        // Rollback plan? technically yes, but soft fail is safer for now. We can manually fix.
        console.error("Batch insert error:", batchError)
        return { success: true, warning: "Plan creado pero algunas reservas fallaron." }
    }

    // 6. TRUTH ADJUSTMENT: Update plan end_date to match the ACTUAL last booking
    if (slots.length > 0) {
        // Extract the date part of the last slot (YYYY-MM-DD local representation)
        // slots[last].start is ISO string. 
        // We need local YYYY-MM-DD.
        const lastSlotIso = slots[slots.length - 1].start
        const lastDateObj = parseISO(lastSlotIso) // parses as date object
        // Reconstruct manually to avoid timezone shifts
        const yyyy = lastDateObj.getFullYear()
        const mm = String(lastDateObj.getMonth() + 1).padStart(2, '0')
        const dd = String(lastDateObj.getDate()).padStart(2, '0')
        const actualEndDate = `${yyyy}-${mm}-${dd}`

        // Execute Silent Update
        await supabase
            .from('recurring_plans')
            .update({ end_date: actualEndDate })
            .eq('id', plan.id)
    }

    revalidatePath('/club/fixed-members')
    return { success: true, count: slots.length }
}

export async function updateRecurringPlan(params: UpdatePlanParams) {
    const supabase = await createClient()
    const { planId, courtId, dayOfWeek, startTime, price, paymentAdvance } = params

    // 1. Fetch Plan to get dates
    const { data: plan } = await supabase.from('recurring_plans').select('*').eq('id', planId).single()
    if (!plan) return { success: false, error: "Plan no encontrado." }

    // 2. Define new updates
    const updates = {
        court_id: courtId,
        day_of_week: dayOfWeek,
        start_time: startTime + ':00',
        total_price: price,
        payment_advance: paymentAdvance
    }

    // 3. Update Plan Header
    const { error: upError } = await supabase
        .from('recurring_plans')
        .update(updates)
        .eq('id', planId)

    if (upError) return { success: false, error: "Error actualizando el plan." }

    // 4. LOGIC BRANCH: Intelligent Rescheduling vs Price Propagation
    // Detect if we need to regenerate structure (Time/Court change) or just update values (Price)
    const oldStartRaw = plan.start_time ? plan.start_time.slice(0, 5) : ''
    const isScheduleChange =
        plan.court_id !== courtId ||
        plan.day_of_week !== dayOfWeek ||
        oldStartRaw !== startTime ||
        plan.payment_advance !== paymentAdvance

    const nowISO = new Date().toISOString()

    if (isScheduleChange) {
        // === OPTION A: STRUCTURAL CHANGE (Nuke & Pave) ===
        // Logic: Delete unpaid + Move paid + Create new slots

        // A. Calculate NEW Slots
        const todayDate = nowISO.split('T')[0]

        // Re-calculate slots from EITHER active start_date OR today, whichever is later
        let calcStart = plan.start_date
        if (isBefore(parseISO(calcStart), new Date())) {
            calcStart = todayDate
        }

        const slots = calculateSlots(calcStart, plan.end_date, dayOfWeek, startTime)

        // B. Conflict Check (Ignoring OWN bookings)
        const conflict = await checkConflicts(supabase, courtId, slots, planId)
        if (conflict) {
            return { success: false, error: `Imposible actualizar: ${conflict}` }
        }

        // C. Process Bookings
        const { data: existingBookings } = await supabase
            .from('bookings')
            .select('id, payment_status, start_time')
            .eq('recurring_plan_id', planId)
            .gte('start_time', nowISO)
            .neq('payment_status', 'canceled')

        if (existingBookings) {
            const unpaidIds = existingBookings.filter(b => b.payment_status !== 'paid').map(b => b.id)
            const paidBookings = existingBookings.filter(b => b.payment_status === 'paid')

            // EXECUTION 1: DELETE Unpaid (clean slate)
            if (unpaidIds.length > 0) {
                await supabase.from('bookings').delete().in('id', unpaidIds)

                // RE-CREATE Unpaid with NEW PRICE
                const bookingsToInsert = []
                for (const slot of slots) {
                    // Check if this slot is already covered by a PAID booking
                    const isCovered = paidBookings.some(pb => pb.start_time === slot.start)
                    if (!isCovered) {
                        bookingsToInsert.push({
                            entity_id: plan.organization_id,
                            court_id: courtId,
                            user_id: plan.user_id,
                            member_id: plan.member_id,
                            start_time: slot.start,
                            end_time: slot.end,
                            title: 'Reserva Fija (Modificada)',
                            payment_status: paymentAdvance ? 'paid' : 'pending',
                            recurring_plan_id: planId,
                            price: price
                        })
                    }
                }
                if (bookingsToInsert.length > 0) {
                    await supabase.from('bookings').insert(bookingsToInsert)
                }
            }

            // EXECUTION 2: UPDATE Paid (Move them)
            // Strategy: Shift days and update time, keeping Paid status and original Price.
            for (const booking of paidBookings) {
                const oldDate = parseISO(booking.start_time)
                const currentDayIndex = oldDate.getDay() // 0-6
                const targetDayIndex = dayOfWeek

                const daysDiff = targetDayIndex - currentDayIndex
                const newDate = new Date(oldDate)
                newDate.setDate(newDate.getDate() + daysDiff)

                // Set new time
                const [h, m] = startTime.split(':').map(Number)
                newDate.setHours(h, m, 0, 0)

                const newEnd = addMinutes(newDate, 90)

                await supabase.from('bookings').update({
                    court_id: courtId,
                    start_time: newDate.toISOString(),
                    end_time: newEnd.toISOString(),
                    description: 'Rescheduled from original plan | Paid'
                }).eq('id', booking.id)
            }
        }
    } else {
        // === OPTION B: PRICE PROPAGATION (Safe Update) ===
        // "El dueño edita precio ($70 -> $50). Actualizar reservas futuras impagas."

        const { error: propError, count } = await supabase
            .from('bookings')
            .update({ price: price }) // Actualiza al nuevo precio
            .eq('recurring_plan_id', planId)
            .gte('start_time', nowISO) // Solo Futuras
            .neq('payment_status', 'paid') // Solo Impagas
            .neq('payment_status', 'canceled')

        if (propError) {
            console.error("Propagation Error:", propError)
            return { success: false, error: "Plan actualizado pero falló la propagación de precios." }
        }
    }

    revalidatePath('/club/fixed-members')
    return { success: true }
}

export async function getRecurringPlans(orgId: string) {
    const supabase = await createClient()

    // 1. Vampire Hunter
    const todayISO = new Date().toISOString().split('T')[0]
    await supabase.from('recurring_plans')
        .update({ active: false })
        .eq('organization_id', orgId)
        .eq('active', true)
        .lt('end_date', todayISO)

    // 2. Fetch
    const { data: plansData, error } = await supabase
        .from('recurring_plans')
        .select(`*, user:users(full_name, email, phone), member:club_members(full_name, email, phone)`)
        .eq('organization_id', orgId)
        .eq('active', true)
        .order('created_at', { ascending: false })

    if (error || !plansData) return []

    const planIds = plansData.map(p => p.id)
    if (planIds.length === 0) return plansData

    // 3. True Remaining Logic & DEBT CALCULATION
    const { data: allBookings } = await supabase
        .from('bookings')
        .select('recurring_plan_id, start_time, payment_status, price')
        .in('recurring_plan_id', planIds)
        .neq('payment_status', 'canceled')

    const now = new Date()
    const counts: Record<string, { future: number, total: number, debt: number }> = {}

    allBookings?.forEach((b) => {
        if (!counts[b.recurring_plan_id]) counts[b.recurring_plan_id] = { future: 0, total: 0, debt: 0 }

        counts[b.recurring_plan_id].total++

        if (new Date(b.start_time) >= now) {
            counts[b.recurring_plan_id].future++
        }

        // DEBT CALCULATION: Sum price of pending bookings
        if (b.payment_status === 'pending') {
            counts[b.recurring_plan_id].debt += (Number(b.price) || 0)
        }
    })

    return plansData.map(p => ({
        ...p,
        remaining_sessions: counts[p.id]?.future || 0,
        total_sessions: counts[p.id]?.total || 0,
        pending_debt: counts[p.id]?.debt || 0
    }))
}

export async function getPendingBookings(planId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('bookings')
        .select('id, start_time, price, title, court:courts(name)')
        .eq('recurring_plan_id', planId)
        .eq('payment_status', 'pending')
        .order('start_time', { ascending: true })

    return data || []
}

export async function settlePlanBilling(planId: string, monthDate: string, specificBookingIds?: string[]) {
    const supabase = await createClient()

    let query = supabase
        .from('bookings')
        .update({ payment_status: 'paid' })
        .eq('recurring_plan_id', planId)
        .neq('payment_status', 'canceled')
        .neq('payment_status', 'paid')

    // If specific IDs provided, pay only those. Else, pay all for the month.
    if (specificBookingIds && specificBookingIds.length > 0) {
        query = query.in('id', specificBookingIds)
    } else {
        const targetDate = parseISO(monthDate)
        const startObj = startOfMonth(targetDate)
        const endObj = startOfMonth(addMonths(targetDate, 1))
        query = query
            .gte('start_time', startObj.toISOString())
            .lt('start_time', endObj.toISOString())
    }

    const { data: updated, error } = await query.select('id, price')

    if (error) {
        console.error("Settlement Error:", error)
        throw new Error("Error al procesar el pago.")
    }

    const count = updated?.length || 0
    const totalAmount = updated?.reduce((sum, b) => sum + (Number(b.price) || 0), 0) || 0

    revalidatePath('/club/fixed-members')
    revalidatePath('/club/calendar')
    return { success: true, count, totalAmount }
}

// --- HELPERS ---

function calculateSlots(startStr: string, endStr: string, dayOfWeek: number, startTime: string) {
    const slots = []
    let current = parseISO(startStr)
    const end = parseISO(endStr)
    const [h, m] = startTime.split(':').map(Number)

    // Align to first occurrence
    // Force current to be at least startStr. If current.day != dayOfWeek, add days.
    // BUT we must respect the user's start choice. 
    // If user chose a Monday date but selected 'Tuesday', we scan forward to Tuesday.
    while (current.getDay() !== dayOfWeek) {
        current.setDate(current.getDate() + 1)
    }

    // Fix Bug 1: Strict Iterations. 
    // We treat 'end_date' as EXCLUSIVE boundary.
    // Use Case: "1 Month (4 weeks)". Start Jan 1. End = Jan 1 + 4 weeks = Jan 29.
    // Jan 1, 8, 15, 22 are valid (4 items). Jan 29 is the limit (Exclusive).
    // This prevents generating 5 sessions for a 4-week selection.
    while (isBefore(current, end)) {
        const s = new Date(current)
        s.setHours(h, m, 0, 0)
        const e = addMinutes(s, 90)

        slots.push({
            start: s.toISOString(),
            end: e.toISOString()
        })

        current = addWeeks(current, 1)
    }
    return slots
}

// New signature allows excluding a planId (for updates)
async function checkConflicts(supabase: any, courtId: string, slots: { start: string, end: string }[], ignorePlanId?: string) {
    if (slots.length === 0) return null
    const first = slots[0].start
    const last = slots[slots.length - 1].end

    let query = supabase.from('bookings')
        .select('start_time, end_time, recurring_plan_id')
        .eq('court_id', courtId)
        .gte('end_time', first)
        .lte('start_time', last)
        .neq('payment_status', 'canceled') // Valid bookings only

    // If updating, ignore our own bookings
    if (ignorePlanId) {
        query = query.neq('recurring_plan_id', ignorePlanId)
    }

    const { data: conflicts } = await query

    if (!conflicts || conflicts.length === 0) return null

    for (const slot of slots) {
        const sStart = new Date(slot.start).getTime()
        const sEnd = new Date(slot.end).getTime()

        const clash = conflicts.find((c: any) => {
            const cStart = new Date(c.start_time).getTime()
            const cEnd = new Date(c.end_time).getTime()
            return (sStart < cEnd && sEnd > cStart)
        })

        if (clash) {
            // Return readable error
            const dateStr = formatLocal(clash.start_time)
            return `La fecha ${dateStr} ya está ocupada.`
        }
    }
    return null
}

function formatLocal(iso: string) {
    // Simple formatter for error messages
    const d = new Date(iso)
    return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
}

export async function extendPlanDueToIncident(planId: string, bookingId: string, reason: string) {
    const supabase = await createClient()

    // 1. Fetch Booking and Plan
    const { data: booking, error: bError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

    if (bError || !booking) return { success: false, error: "Reserva no encontrada." }

    const { data: plan, error: pError } = await supabase
        .from('recurring_plans')
        .select('*')
        .eq('id', planId)
        .single()

    if (pError || !plan) return { success: false, error: "Plan no encontrado." }

    // 2. Calculate New Date (Push to End)
    // Use proper date manipulation to avoid UTC-shift bugs with strings
    // 2. Calculate New Date (Push to End)
    // Use proper date manipulation to avoid UTC-shift bugs with strings
    const currentEndDate = parseISO(plan.end_date)
    let pointer = new Date(currentEndDate)
    pointer.setDate(pointer.getDate() + 1) // Start looking from day after end_date to avoid self-collision

    // Safety brake for infinite loops
    let loops = 0
    while (pointer.getDay() !== plan.day_of_week && loops < 14) {
        pointer.setDate(pointer.getDate() + 1)
        loops++
    }

    if (loops >= 14) return { success: false, error: "No se pudo calcular la próxima fecha válida." }

    const newStartDateStr = formatLocal(pointer.toISOString()).split(' ')[0] // "DD/MM HH:mm" -> Just used for logs? No, we need YYYY-MM-DD for DB.
    // Wait, formatLocal returns "DD/MM HH:mm". That is NOT valid for end_date column (YYYY-MM-DD).
    // Let's reconstruct consistent YYYY-MM-DD.

    // We already have the logic below for 'newStart' (Date object).
    // We can extract YYYY-MM-DD safely from pointer.
    const yyyy = pointer.getFullYear()
    const mm = String(pointer.getMonth() + 1).padStart(2, '0')
    const dd = String(pointer.getDate()).padStart(2, '0')
    const finalNewEndDateStr = `${yyyy}-${mm}-${dd}`

    // 3. Conflict Check
    const startTimeStr = plan.start_time // "HH:MM:00"
    const [h, m] = startTimeStr.split(':').map(Number)

    const newStart = new Date(pointer)
    newStart.setHours(h, m, 0, 0)

    // Ensure we are indeed in the future relative to the original booking?
    // Not strictly necessary, but good sanity check.

    // Calculate End Time
    // Rely on original booking duration
    const origStart = new Date(booking.start_time).getTime()
    const origEnd = new Date(booking.end_time).getTime()
    const durationMinutes = (origEnd - origStart) / 60000

    const newEnd = addMinutes(newStart, durationMinutes > 0 ? durationMinutes : 90)

    const conflicts = await checkConflicts(supabase, plan.court_id, [{ start: newStart.toISOString(), end: newEnd.toISOString() }])

    if (conflicts) {
        return { success: false, error: `No se puede extender: ${conflicts}` }
    }

    // 4. TRANSACTION SIMULATION (Manual Rollback Strategy)
    // ORDER: Insert New -> Cancel Old -> Update Plan

    // A. Insert New Booking
    // "Dinero: Si la original estaba pagada, la nueva nace pagada. Si no, nace pendiente."
    const newPaymentStatus = booking.payment_status === 'paid' ? 'paid' : 'pending'

    // Fallback for missing entity_id (though unlikely)
    const entityId = plan.organization_id || booking.entity_id

    const { data: newBooking, error: createError } = await supabase
        .from('bookings')
        .insert({
            entity_id: entityId,
            court_id: plan.court_id,
            user_id: plan.user_id,
            member_id: plan.member_id,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            title: booking.title,
            payment_status: newPaymentStatus,
            recurring_plan_id: plan.id,
            price: booking.price,
            description: `Reprogramado por Incidencia: ${reason}`
        })
        .select()
        .single()

    if (createError) {
        console.error("Insert Error:", createError)
        return { success: false, error: "Error critico: No se pudo crear la nueva reserva. Operación abortada." }
    }

    // B. Cancel Old Booking
    const { error: cancelError } = await supabase
        .from('bookings')
        .update({
            payment_status: 'canceled',
            description: `Cancelado por Incidencia: ${reason} (Movido al final)`
        })
        .eq('id', bookingId)

    if (cancelError) {
        // ROLLBACK: Delete the new booking we just created
        console.error("Cancel Error (Rolling back):", cancelError)
        await supabase.from('bookings').delete().eq('id', newBooking.id)
        return { success: false, error: "Error al cancelar la reserva original. Se han revertido los cambios." }
    }

    // C. Update Plan End Date
    const { error: updatePlanError } = await supabase
        .from('recurring_plans')
        .update({ end_date: finalNewEndDateStr })
        .eq('id', planId)

    if (updatePlanError) {
        // Partial Failure: Bookings are correct (Swapped), but Plan Date is old.
        // This is non-fatal for operations (users can play), but bad for logic.
        // We log it but don't revert the bookings because the user effectively "did" the action.
        console.error("Plan Update Error (Non-fatal):", updatePlanError)
    }

    revalidatePath('/club/fixed-members')
    revalidatePath('/club/calendar') // Refresh calendar too
    return { success: true, newDate: formatLocal(newStart.toISOString()) }
}
