-- FIX: Data Identity for Recurring Bookings

-- 1. Update Existing 'Reserva Fija' titles to real User Names
UPDATE public.bookings b
SET title = u.full_name
FROM public.recurring_plans rp
JOIN public.users u ON rp.user_id = u.id
WHERE b.recurring_plan_id = rp.id
AND b.title = 'Reserva Fija';

-- 2. Create Trigger Function to Enforce Identity on New Inserts
CREATE OR REPLACE FUNCTION public.enforce_recurring_identity()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    -- Only act if it's a recurring booking (linked to a plan)
    IF NEW.recurring_plan_id IS NOT NULL THEN
        -- Lookup the user name via the plan's owner
        SELECT u.full_name INTO v_user_name
        FROM public.recurring_plans rp
        JOIN public.users u ON rp.user_id = u.id
        WHERE rp.id = NEW.recurring_plan_id;
        
        -- If found, overwrite the title to ensure consistency
        IF v_user_name IS NOT NULL THEN
            NEW.title := v_user_name;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bind Trigger
DROP TRIGGER IF EXISTS trigger_enforce_recurring_identity ON public.bookings;

CREATE TRIGGER trigger_enforce_recurring_identity
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_recurring_identity();
