-- FIX: Recurring Payments & Contracts
-- 1. Add 'payment_advance' column to recurring_plans
ALTER TABLE public.recurring_plans
ADD COLUMN IF NOT EXISTS payment_advance BOOLEAN DEFAULT false;

-- 2. Function to Pay Monthly Batch
-- Pays all pending bookings for a specific plan in the current month (or specified date)
CREATE OR REPLACE FUNCTION public.pay_recurring_month_batch(
    p_plan_id UUID,
    p_month_date DATE DEFAULT CURRENT_DATE
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_updated_count INT;
BEGIN
    -- Define month boundaries
    v_start_date := date_trunc('month', p_month_date);
    v_end_date := v_start_date + interval '1 month'; -- Exclusive
    
    -- Update Loop
    WITH updated AS (
        UPDATE public.bookings
        SET payment_status = 'paid'
        WHERE recurring_plan_id = p_plan_id
        AND start_time >= v_start_date
        AND start_time < v_end_date
        AND payment_status != 'paid'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_updated_count FROM updated;
    
    -- Log the batch action (Optional: Application level usually logs this, but we could add a system log)
    
    RETURN v_updated_count;
END;
$$;
