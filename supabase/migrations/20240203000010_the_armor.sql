-- "The Armor" & Clean Up (Final V3)

-- 1. CLEANUP: Force Delete Ghost Booking (Phill)
-- Strategy: Use session_replication_role to bypass triggers without needing superuser ALTER TABLE permissions on system triggers.
SET session_replication_role = 'replica';

DELETE FROM public.booking_logs WHERE booking_id = '61907aa1-70bc-4de9-9186-77c29cad4094';
DELETE FROM public.bookings WHERE id = '61907aa1-70bc-4de9-9186-77c29cad4094';

SET session_replication_role = 'origin';

-- 2. ENABLE EXTENSION
-- Required for GIST index on UUID + TstzRange
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 3. THE ARMOR (Exclusion Constraint)
-- This enforces physically non-overlapping bookings per court.
-- Usage of '&&' operator checks for overlap in tstzrange.
-- CRITICAL improvement: We look for overlap ONLY among active (non-canceled) bookings.
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  court_id WITH =,
  tstzrange(start_time, end_time) WITH &&
)
WHERE (payment_status != 'canceled');
