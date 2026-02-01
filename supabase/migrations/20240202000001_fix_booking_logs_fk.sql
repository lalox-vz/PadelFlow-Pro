-- ================================================
-- Fix booking_logs foreign key relationship
-- ================================================

-- Add foreign key constraint to users table
-- This allows the join query: booking_logs -> users to work
ALTER TABLE public.booking_logs 
DROP CONSTRAINT IF EXISTS fk_booking_logs_user;

ALTER TABLE public.booking_logs 
ADD CONSTRAINT fk_booking_logs_user 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE SET NULL;

-- Verify the constraint was created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_booking_logs_user'
        AND table_name = 'booking_logs'
    ) THEN
        RAISE NOTICE '✅ Foreign key constraint created successfully';
    ELSE
        RAISE EXCEPTION '❌ Failed to create foreign key constraint';
    END IF;
END $$;

COMMENT ON CONSTRAINT fk_booking_logs_user ON public.booking_logs IS 'Links booking logs to the user who made the change';
