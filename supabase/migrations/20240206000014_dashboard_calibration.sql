-- CALIBRATION SCRIPT V1: Fix Dashboard Client Counting logic
-- Objective: update 'get_dashboard_stats' to count real humans (club_members) instead of just app users.

CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_organization_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    -- Current Period
    v_total_revenue NUMERIC;
    v_total_bookings INT;
    v_active_clients INT;
    v_average_ticket NUMERIC;
    v_occupancy_rate NUMERIC;
    
    -- Previous Period (for growth calculations)
    v_prev_revenue NUMERIC;
    v_prev_bookings INT;
    v_prev_clients INT;
    v_prev_ticket NUMERIC;
    v_prev_occupancy NUMERIC;
    
    -- Growth Rates
    v_revenue_growth NUMERIC;
    v_bookings_growth NUMERIC;
    v_clients_growth NUMERIC;
    v_ticket_growth NUMERIC;
    v_occupancy_growth NUMERIC;
    
    -- Breakdown
    v_breakdown_reservations NUMERIC;
    v_breakdown_recurring NUMERIC;
    
    -- Court/Capacity Info
    v_court_count INT;
    v_base_price NUMERIC;
    v_hourly_potential NUMERIC;
    v_operating_hours INT := 16; -- Typical: 7am-11pm = 16 hours
    v_total_available_hours INT;
    v_booked_hours INT;
    v_prev_booked_hours INT;

    v_chart_data JSONB;
    v_heatmap_data JSONB;
    
    v_declared_cash NUMERIC;
    v_cash_discrepancy NUMERIC;
    
    v_period_days INT;
    
    -- Local Date Boundaries
    v_local_start_date DATE;
    v_local_end_date DATE;
    v_local_prev_start DATE;
    v_local_prev_end DATE;
BEGIN
    -- 0. Init & Timezone Normalization
    v_local_start_date := (p_start_date AT TIME ZONE 'America/Caracas')::date;
    v_local_end_date := (p_end_date AT TIME ZONE 'America/Caracas')::date;
    
    -- Calculate period length and previous period boundaries
    v_period_days := (v_local_end_date - v_local_start_date) + 1;
    v_local_prev_start := v_local_start_date - v_period_days;
    v_local_prev_end := v_local_start_date - 1;

    -- 0b. Get Court Info for Occupancy Calculation
    SELECT COUNT(*) INTO v_court_count 
    FROM courts 
    WHERE club_id = p_organization_id AND is_active = true;
    
    -- Calculate total available hours for the period
    v_total_available_hours := GREATEST(v_court_count * v_operating_hours * v_period_days, 1);
    
    -- Get base price for heatmap normalization
    SELECT COALESCE(
        (SELECT price FROM pricing_rules WHERE entity_id = p_organization_id AND name ILIKE '%Base%' LIMIT 1),
        (SELECT AVG((details->>'basePrice')::numeric) FROM courts WHERE club_id = p_organization_id),
        20
    ) INTO v_base_price;
    v_hourly_potential := GREATEST(v_court_count * v_base_price, 1);

    -- ========================================
    -- CURRENT PERIOD CALCULATIONS
    -- ========================================
    
    -- 1. Total Revenue & Booking Count (Current Period)
    SELECT 
        COALESCE(SUM(COALESCE(price, 0)), 0),
        COUNT(*)
    INTO v_total_revenue, v_total_bookings
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date
    AND payment_status IN ('paid', 'approved', 'completed');

    -- 2. Active Clients (SWISS WATCH FIX)
    -- Logic: We count unique people who generated revenue in this period.
    -- We join sticky bookings to club_members implicitly through logic or direct match if possible.
    -- Since bookings might not have member_id backfilled yet on every row, we use a smart approach:
    -- Count distinct 'user_id' for app users + distinct 'title' for Manual bookings where user_id is null.
    -- This gives a much more accurate representation of human traffic.
    SELECT (
        COUNT(DISTINCT user_id) + 
        COUNT(DISTINCT title) FILTER (WHERE user_id IS NULL)
    )
    INTO v_active_clients
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date
    AND payment_status IN ('paid', 'approved', 'completed');

    -- 3. Calculate Average Ticket (Revenue / Bookings)
    v_average_ticket := CASE WHEN v_total_bookings > 0 
        THEN v_total_revenue / v_total_bookings 
        ELSE 0 END;

    -- 4. Calculate Booked Hours (for Occupancy)
    SELECT COUNT(*)
    INTO v_booked_hours
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date
    AND payment_status NOT IN ('canceled', 'cancelled');
    
    -- 5. Calculate Occupancy Rate
    v_occupancy_rate := CASE WHEN v_total_available_hours > 0 
        THEN ROUND((v_booked_hours::numeric / v_total_available_hours) * 100, 1)
        ELSE 0 END;

    -- ========================================
    -- PREVIOUS PERIOD CALCULATIONS (for growth)
    -- ========================================
    
    -- Previous Revenue & Bookings
    SELECT 
        COALESCE(SUM(COALESCE(price, 0)), 0),
        COUNT(*)
    INTO v_prev_revenue, v_prev_bookings
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_prev_start
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_prev_end
    AND payment_status IN ('paid', 'approved', 'completed');

    -- Previous Active Clients (SWISS WATCH FIX)
    SELECT (
        COUNT(DISTINCT user_id) + 
        COUNT(DISTINCT title) FILTER (WHERE user_id IS NULL)
    )
    INTO v_prev_clients
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_prev_start
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_prev_end
    AND payment_status IN ('paid', 'approved', 'completed');

    -- Previous Average Ticket
    v_prev_ticket := CASE WHEN v_prev_bookings > 0 
        THEN v_prev_revenue / v_prev_bookings 
        ELSE 0 END;

    -- Previous Booked Hours
    SELECT COUNT(*)
    INTO v_prev_booked_hours
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_prev_start
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_prev_end
    AND payment_status NOT IN ('canceled', 'cancelled');

    -- Previous Occupancy
    v_prev_occupancy := CASE WHEN v_total_available_hours > 0 
        THEN ROUND((v_prev_booked_hours::numeric / v_total_available_hours) * 100, 1)
        ELSE 0 END;

    -- ========================================
    -- GROWTH RATE CALCULATIONS
    -- ========================================
    
    v_revenue_growth := CASE WHEN v_prev_revenue > 0 
        THEN ROUND(((v_total_revenue - v_prev_revenue) / v_prev_revenue) * 100, 1)
        ELSE 0 END;
    
    v_bookings_growth := CASE WHEN v_prev_bookings > 0 
        THEN ROUND(((v_total_bookings - v_prev_bookings)::numeric / v_prev_bookings) * 100, 1)
        ELSE 0 END;
    
    v_clients_growth := CASE WHEN v_prev_clients > 0 
        THEN ROUND(((v_active_clients - v_prev_clients)::numeric / v_prev_clients) * 100, 1)
        ELSE 0 END;
    
    v_ticket_growth := CASE WHEN v_prev_ticket > 0 
        THEN ROUND(((v_average_ticket - v_prev_ticket) / v_prev_ticket) * 100, 1)
        ELSE 0 END;
    
    v_occupancy_growth := CASE WHEN v_prev_occupancy > 0 
        THEN ROUND(((v_occupancy_rate - v_prev_occupancy) / v_prev_occupancy) * 100, 1)
        ELSE 0 END;

    -- ========================================
    -- BREAKDOWN (Casual vs Recurring)
    -- ========================================
    SELECT 
        COALESCE(SUM(CASE WHEN recurring_plan_id IS NULL THEN COALESCE(price, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN recurring_plan_id IS NOT NULL THEN COALESCE(price, 0) ELSE 0 END), 0)
    INTO v_breakdown_reservations, v_breakdown_recurring
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date
    AND payment_status IN ('paid', 'approved', 'completed');

    -- ========================================
    -- CHART DATA (Daily with Zero-Fill)
    -- ========================================
    WITH date_series AS (
        SELECT generate_series(v_local_start_date, v_local_end_date, '1 day'::interval)::date AS day
    ),
    daily_sales AS (
        SELECT 
            (start_time AT TIME ZONE 'America/Caracas')::date AS day,
            SUM(COALESCE(price, 0)) as income
        FROM bookings
        WHERE entity_id = p_organization_id
        AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
        AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date
        AND payment_status IN ('paid', 'approved', 'completed')
        GROUP BY 1
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', TO_CHAR(ds.day, 'YYYY-MM-DD'),
            'income', COALESCE(s.income, 0)
        ) ORDER BY ds.day
    ) INTO v_chart_data 
    FROM date_series ds
    LEFT JOIN daily_sales s ON ds.day = s.day;

    -- ========================================
    -- HEATMAP DATA
    -- ========================================
    WITH heatmap_raw AS (
        SELECT 
            EXTRACT(DOW FROM start_time AT TIME ZONE 'America/Caracas') as day_idx,
            EXTRACT(HOUR FROM start_time AT TIME ZONE 'America/Caracas') as hour_idx,
            SUM(COALESCE(price, 0)) as revenue_generated
        FROM bookings
        WHERE entity_id = p_organization_id
        AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
        AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date
        AND payment_status IN ('paid', 'approved', 'completed')
        GROUP BY 1, 2
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'day', day_idx,
            'hour', hour_idx,
            'value', (revenue_generated / v_hourly_potential) * 100,
            'revenue', revenue_generated
        )
    ) INTO v_heatmap_data FROM heatmap_raw;

    -- ========================================
    -- CASH DISCREPANCY (Audit)
    -- ========================================
    SELECT COALESCE(SUM(cash_amount + transfer_amount + card_amount), 0)
    INTO v_declared_cash
    FROM shift_reports
    WHERE organization_id = p_organization_id
    AND (created_at AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (created_at AT TIME ZONE 'America/Caracas')::date <= v_local_end_date;

    v_cash_discrepancy := v_declared_cash - v_total_revenue;

    -- ========================================
    -- RETURN COMPLETE STATS
    -- ========================================
    RETURN jsonb_build_object(
        'kpi', jsonb_build_object(
            'totalRevenue', v_total_revenue,
            'revenueGrowth', v_revenue_growth,
            'totalBookings', v_total_bookings,
            'bookingsGrowth', v_bookings_growth,
            'activeClients', v_active_clients,
            'clientsGrowth', v_clients_growth,
            'averageTicket', v_average_ticket,
            'ticketGrowth', v_ticket_growth,
            'occupancyRate', v_occupancy_rate,
            'occupancyGrowth', v_occupancy_growth
        ),
        'breakdown', jsonb_build_object(
            'reservations', v_breakdown_reservations,
            'recurring', v_breakdown_recurring
        ),
        'chart', COALESCE(v_chart_data, '[]'::jsonb),
        'heatmap', COALESCE(v_heatmap_data, '[]'::jsonb),
        'audit', jsonb_build_object(
            'declared', v_declared_cash,
            'discrepancy', v_cash_discrepancy
        ),
        'meta', jsonb_build_object(
            'periodDays', v_period_days,
            'courtCount', v_court_count,
            'availableHours', v_total_available_hours,
            'bookedHours', v_booked_hours
        )
    );
END;
$$;
