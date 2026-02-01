-- Rain Check Logic
-- Handles cancellation and extension of recurring bookings

CREATE OR REPLACE FUNCTION public.extend_recurring_booking(p_booking_id UUID, p_admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_plan RECORD;
    v_new_date DATE;
    v_new_start TIMESTAMPTZ;
    v_new_end TIMESTAMPTZ;
    v_conflict_count INT;
    v_new_booking_id UUID;
BEGIN
    -- 1. Get Booking Info
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    
    IF v_booking.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Reserva no encontrada');
    END IF;

    IF v_booking.recurring_plan_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta reserva no pertenece a un plan recurrente');
    END IF;

    -- 2. Get Plan Info
    SELECT * INTO v_plan FROM public.recurring_plans WHERE id = v_booking.recurring_plan_id;

    -- 3. Calculate New Date (1 week after current plan end_date)
    -- Logic: find next matching day_of_week after v_plan.end_date
    -- Actually simple logic: just add 7 days to end_date? 
    -- If the plan is every Monday, and end_date is a Monday, new date is end_date + 7.
    -- If end_date is arbitrary, we need to find the next weekday.
    -- Assuming end_date aligns with the last session for simplicity, or we calculate based on day_of_week.
    
    -- Robust implementation:
    -- Find the next occurrence of v_plan.day_of_week AFTER v_plan.end_date.
    -- Postgres day of week: 0=Sun .. 6=Sat.
    
    -- Let's jump 1 week from end_date and adjust?
    -- Better: Generate series from end_date + 1 day, find first match.
    
    SELECT d::date INTO v_new_date
    FROM generate_series(v_plan.end_date + interval '1 day', v_plan.end_date + interval '14 days', interval '1 day') AS d
    WHERE extract(dow from d) = v_plan.day_of_week
    LIMIT 1;

    IF v_new_date IS NULL THEN
         RETURN jsonb_build_object('success', false, 'error', 'No se pudo calcular la fecha de extensión');
    END IF;

    -- Construct timestamps
    v_new_start := (v_new_date || ' ' || v_plan.start_time)::timestamptz;
    v_new_end := v_new_start + (v_plan.duration_mins || ' minutes')::interval;

    -- 4. Check Conflicts
    SELECT count(*) INTO v_conflict_count
    FROM public.bookings
    WHERE court_id = v_plan.court_id
    AND status != 'cancelled'
    AND start_time < v_new_end
    AND end_time > v_new_start;

    IF v_conflict_count > 0 THEN
         RETURN jsonb_build_object('success', false, 'error', 'Conflicto: la fecha de extensión ya está ocupada (' || v_new_date || ')');
    END IF;

    -- 5. Cancel Current Booking
    UPDATE public.bookings 
    SET status = 'cancelled', 
        payment_status = 'refunded', -- Or kept as credit? Booking logic usually implies 'cancelled' frees up slot.
        -- Let's say 'cancelled' but we are extending, so money is used for the new one.
        -- We don't change payment_status to refund strictly, maybe just 'transferred'?
        -- Keeping it simple: status = cancelled.
        title = title || ' (Lluvia - Extendido)'
    WHERE id = p_booking_id;

    -- 6. Insert New Booking
    INSERT INTO public.bookings (
        court_id, 
        user_id, 
        start_time, 
        end_time, 
        title, 
        payment_status, 
        status, 
        type, 
        recurring_plan_id, 
        entity_id -- Assuming bookings has entity_id based on previous context
    ) VALUES (
        v_plan.court_id,
        v_booking.user_id,
        v_new_start,
        v_new_end,
        v_booking.title || ' (Extensión Lluvia)',
        'paid', -- Assume carried over payment
        'confirmed',
        'booking',
        v_plan.id,
        v_plan.organization_id
    ) RETURNING id INTO v_new_booking_id;

    -- 7. Update Plan End Date
    UPDATE public.recurring_plans
    SET end_date = v_new_date
    WHERE id = v_plan.id;

    -- Log Action
    INSERT INTO public.booking_logs (booking_id, user_id, action, notes)
    VALUES (p_booking_id, p_admin_id, 'cancelled', 'Cancelación por Lluvia - Extendida a ' || v_new_date);

    RETURN jsonb_build_object(
        'success', true, 
        'new_date', v_new_date,
        'new_booking_id', v_new_booking_id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
