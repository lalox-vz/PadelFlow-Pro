-- AUDIT UPGRADE: Dashboard RPC V2
-- Features: Cash Discrepancy, Heatmap Wealth, Zero-Fill

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
    
    v_breakdown_reservations NUMERIC;
    v_breakdown_recurring NUMERIC;
    
    v_court_count INT;
    v_base_price NUMERIC;
    v_hourly_potential NUMERIC;

    v_chart_data JSONB;
    v_heatmap_data JSONB;
    
    v_declared_cash NUMERIC;
    v_cash_discrepancy NUMERIC;
    
    v_prev_start_date TIMESTAMPTZ;
    v_period_days INT;
    
    -- Local Date Boundaries (The Truth)
    v_local_start_date DATE;
    v_local_end_date DATE;
    v_local_prev_start DATE;
    v_local_prev_end DATE;
BEGIN
    -- 0. Init & Timezone Normalization
    -- We convert the input timestamps (which might be UTC boundaries) into the implicit "Local Days" the user is interested in.
    v_local_start_date := (p_start_date AT TIME ZONE 'America/Caracas')::date;
    v_local_end_date := (p_end_date AT TIME ZONE 'America/Caracas')::date;
    
    -- Calc previous period based on DAYS
    v_period_days := (v_local_end_date - v_local_start_date) + 1;
    v_local_prev_start := v_local_start_date - v_period_days;
    v_local_prev_end := v_local_start_date - 1;

    -- 0b. Calibration (Smart Profitability)
    SELECT COUNT(*) INTO v_court_count FROM courts WHERE club_id = p_organization_id AND is_active = true;
    -- Try to get base price from rules, valid fallback to court average or safe default
    SELECT COALESCE(
        (SELECT price FROM pricing_rules WHERE entity_id = p_organization_id AND name ILIKE '%Base%' LIMIT 1),
        (SELECT AVG((details->>'basePrice')::numeric) FROM courts WHERE club_id = p_organization_id),
        20 -- Safe Fallback
    ) INTO v_base_price;
    
    v_hourly_potential := GREATEST(v_court_count * v_base_price, 1); -- Avoid div by zero

    -- 1. Total Revenue (Current Period)
    SELECT COALESCE(SUM(COALESCE(price, 0)), 0)
    INTO v_total_revenue
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date
    AND payment_status IN ('paid', 'approved', 'completed');

    -- 1b. Total Revenue (Previous Period)
    SELECT COALESCE(SUM(COALESCE(price, 0)), 0)
    INTO v_prev_revenue
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_prev_start
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_prev_end
    AND payment_status IN ('paid', 'approved', 'completed');

    -- 2. Breakdown
    SELECT 
        COALESCE(SUM(CASE WHEN recurring_plan_id IS NULL THEN COALESCE(price, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN recurring_plan_id IS NOT NULL THEN COALESCE(price, 0) ELSE 0 END), 0)
    INTO v_breakdown_reservations, v_breakdown_recurring
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date
    AND payment_status IN ('paid', 'approved', 'completed');

    -- 3. Active Members
    SELECT COUNT(DISTINCT user_id)
    INTO v_active_members
    FROM bookings
    WHERE entity_id = p_organization_id
    AND (start_time AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (start_time AT TIME ZONE 'America/Caracas')::date <= v_local_end_date;

    -- 4. Chart Data (Daily Aggregation with Zero-Fill)
    -- Generates a series of dates based on LOCAL dates
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

    -- 5. Heatmap Data (Wealth Adjusted & Normalized)
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
            'value', (revenue_generated / v_hourly_potential) * 100, -- Saturation %
            'revenue', revenue_generated
        )
    ) INTO v_heatmap_data FROM heatmap_raw;

    -- 6. Cash Discrepancy Logic
    -- Note: Shift Reports are timestamp based. We assume the same Date logic applies.
    SELECT COALESCE(SUM(cash_amount + transfer_amount + card_amount), 0)
    INTO v_declared_cash
    FROM shift_reports
    WHERE organization_id = p_organization_id
    AND (created_at AT TIME ZONE 'America/Caracas')::date >= v_local_start_date
    AND (created_at AT TIME ZONE 'America/Caracas')::date <= v_local_end_date;

    v_cash_discrepancy := v_declared_cash - v_total_revenue;

    -- Return
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
        'heatmap', COALESCE(v_heatmap_data, '[]'::jsonb),
        'audit', jsonb_build_object(
            'declared', v_declared_cash,
            'discrepancy', v_cash_discrepancy
        )
    );
END;
$$;
