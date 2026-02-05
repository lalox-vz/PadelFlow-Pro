-- MIGRATION: ADD MAINTENANCE STATUS
-- Allows 'maintenance' as a valid payment_status for locking courts without financial impact.

BEGIN;

-- 1. Check if there is a constraint on payment_status and modify it if needed.
-- Since altering a check constraint usually involves dropping and adding, we do it safely.
DO $$
DECLARE
    r record;
BEGIN
    -- Find constraint name specifically for payment_status check
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.bookings'::regclass 
        AND conmac LIKE '%payment_status%' -- Heuristic
        AND contype = 'c'
    LOOP
        EXECUTE format('ALTER TABLE public.bookings DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

-- 2. Add the authoritative constraint including 'maintenance'
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'canceled', 'refunded', 'maintenance'));

COMMIT;
