-- 1. ADD PRICE COLUMN TO BOOKINGS
-- This table is missing the 'price' column needed for revenue calculations.

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.bookings.price IS 'Price of the booking at the time of reservation';

-- 2. RE-CREATE DASHBOARD RPC
-- Now effectively uses the price column.

CREATE OR REPLACE FUNCTION get_dashboard_stats(
    p_organization_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_revenue NUMERIC;
    v_prev_revenue NUMERIC;
    v_active_members INT;
    v_occupancy_rate NUMERIC;
    v_breakdown_reservations NUMERIC;
    v_breakdown_recurring NUMERIC;
    v_chart_data JSONB;
    v_heatmap_data JSONB;
    v_prev_start_date TIMESTAMPTZ;
    v_period_days INT;
BEGIN
    -- Calculate Previous Period
    v_period_days := EXTRACT(DAY FROM (p_end_date - p_start_date));
    v_prev_start_date := p_start_date - (v_period_days || ' days')::INTERVAL;

    -- 1. Total Revenue (Current Period)
    -- Using COALESCE on result and price to handle nulls
    SELECT COALESCE(SUM(COALESCE(price, 0)), 0)
    INTO v_total_revenue
    FROM bookings
    WHERE entity_id = p_organization_id
    AND start_time >= p_start_date
    AND start_time <= p_end_date
    AND payment_status IN ('paid', 'approved', 'completed');

    -- 1b. Total Revenue (Previous Period) for Growth
    SELECT COALESCE(SUM(COALESCE(price, 0)), 0)
    INTO v_prev_revenue
    FROM bookings
    WHERE entity_id = p_organization_id
    AND start_time >= v_prev_start_date
    AND start_time < p_start_date
    AND payment_status IN ('paid', 'approved', 'completed');

    -- 2. Breakdown
    SELECT 
        COALESCE(SUM(CASE WHEN recurring_plan_id IS NULL THEN COALESCE(price, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN recurring_plan_id IS NOT NULL THEN COALESCE(price, 0) ELSE 0 END), 0)
    INTO v_breakdown_reservations, v_breakdown_recurring
    FROM bookings
    WHERE entity_id = p_organization_id
    AND start_time >= p_start_date
    AND start_time <= p_end_date
    AND payment_status IN ('paid', 'approved', 'completed');

    -- 3. Active Members (Unique users in bookings)
    SELECT COUNT(DISTINCT user_id)
    INTO v_active_members
    FROM bookings
    WHERE entity_id = p_organization_id
    AND start_time >= p_start_date
    AND start_time <= p_end_date;

    -- 4. Chart Data (Daily Aggregation)
    WITH daily_data AS (
        SELECT 
            TO_CHAR(start_time, 'YYYY-MM-DD') as date_str,
            SUM(COALESCE(price, 0)) as income
        FROM bookings
        WHERE entity_id = p_organization_id
        AND start_time >= p_start_date
        AND start_time <= p_end_date
        AND payment_status IN ('paid', 'approved', 'completed')
        GROUP BY 1
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'date', date_str,
            'income', income
        )
    ) INTO v_chart_data FROM daily_data;

    -- 5. Heatmap Data
    WITH heatmap_data AS (
        SELECT 
            EXTRACT(DOW FROM start_time) as day_idx,
            EXTRACT(HOUR FROM start_time) as hour_idx,
            COUNT(*) as intensity -- Could also use SUM(price) for value heatmap
        FROM bookings
        WHERE entity_id = p_organization_id
        AND start_time >= p_start_date
        AND start_time <= p_end_date
        GROUP BY 1, 2
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'day', day_idx,
            'hour', hour_idx,
            'value', intensity
        )
    ) INTO v_heatmap_data FROM heatmap_data;

    -- Return Consolidated JSON
    RETURN jsonb_build_object(
        'kpi', jsonb_build_object(
            'totalRevenue', v_total_revenue,
            'revenueGrowth', CASE WHEN v_prev_revenue > 0 THEN ((v_total_revenue - v_prev_revenue) / v_prev_revenue) * 100 ELSE 0 END,
            'activeMembers', v_active_members
        ),
        'breakdown', jsonb_build_object(
            'reservations', v_breakdown_reservations,
            'recurring', v_breakdown_recurring
        ),
        'chart', COALESCE(v_chart_data, '[]'::jsonb),
        'heatmap', COALESCE(v_heatmap_data, '[]'::jsonb)
    );
END;
$$;
