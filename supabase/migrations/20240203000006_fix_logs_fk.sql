-- FIX: Allow Bookings Deletion without breaking Audit Logs
-- Strategy: ON DELETE CASCADE. If a booking is strictly deleted, we remove its logs.
-- Ideally we use Soft Deletes, but the user requested error resolution for the current Delete action.

ALTER TABLE public.booking_logs
DROP CONSTRAINT booking_logs_booking_id_fkey;

ALTER TABLE public.booking_logs
ADD CONSTRAINT booking_logs_booking_id_fkey
FOREIGN KEY (booking_id)
REFERENCES public.bookings(id)
ON DELETE CASCADE;
