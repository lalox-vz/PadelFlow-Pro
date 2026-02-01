-- Add index to optimize pending payments query on dashboard
CREATE INDEX IF NOT EXISTS idx_bookings_pending_dashboard 
ON public.bookings (entity_id, payment_status, start_time);
