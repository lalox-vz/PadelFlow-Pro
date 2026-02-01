-- Update schema for Membership and Payments

-- 1. Updates to 'users' table
-- Add membership tier and expiry
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS membership_tier text CHECK (membership_tier IN ('VIP', 'Access', 'Basic')),
ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz;

-- 2. Create 'payments' table
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    amount numeric,
    method text CHECK (method IN ('Cash', 'Zelle', 'PagoMovil', 'Facebank')) NOT NULL,
    reference_number text,
    sender_name text,
    cedula text, -- For PagoMovil
    proof_url text, -- URL to storage
    status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
    month_paid date NOT NULL, -- e.g. first day of the month they are paying for
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. RLS Policies for Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payments
CREATE POLICY "Users can create payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view and update all payments
CREATE POLICY "Admins can view all payments" ON public.payments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
    );
