-- Add sender_phone to payments table for PagoMovil
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS sender_phone text;
