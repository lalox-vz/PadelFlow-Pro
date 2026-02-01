-- Create Fixed Memberships (Definitions of recurring slots)
CREATE TABLE IF NOT EXISTS public.fixed_memberships (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- The "Socio Fijo"
    court_id uuid REFERENCES public.courts(id) ON DELETE SET NULL,
    day_of_week integer NOT NULL, -- 0=Sunday, 1=Monday...
    start_time time NOT NULL,
    duration_minutes integer DEFAULT 90,
    price_monthly numeric NOT NULL DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Create Fixed Membership Payments (The monthly ledger)
CREATE TABLE IF NOT EXISTS public.fixed_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    membership_id uuid REFERENCES public.fixed_memberships(id) ON DELETE CASCADE NOT NULL,
    club_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    month_date date NOT NULL, -- e.g., '2024-02-01' for Feb
    amount numeric NOT NULL,
    status text DEFAULT 'pending', -- pending, paid, overdue
    receipt_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixed_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_payments ENABLE ROW LEVEL SECURITY;

-- Policies for Fixed Memberships
CREATE POLICY "Owners can manage fixed memberships" ON public.fixed_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.entities 
            WHERE id = club_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own memberships" ON public.fixed_memberships
    FOR SELECT USING (user_id = auth.uid());

-- Policies for Payments
CREATE POLICY "Owners can manage payments" ON public.fixed_payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.entities 
            WHERE id = club_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own payments" ON public.fixed_payments
    FOR SELECT USING (user_id = auth.uid());

-- Trigger to update 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fixed_payments_modtime
    BEFORE UPDATE ON public.fixed_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
