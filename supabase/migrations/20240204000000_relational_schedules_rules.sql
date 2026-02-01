-- Create Opening Hours Table
CREATE TABLE IF NOT EXISTS public.opening_hours (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_id, day_of_week) -- One schedule per day per club for now
);

-- Create Pricing Rules Table (Dynamic Pricing)
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    name TEXT, -- e.g. "Peak Hours"
    days INTEGER[] NOT NULL, -- Array of days e.g. {1,2,3,4,5}
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Policies for Opening Hours
CREATE POLICY "Public read access for opening_hours" ON public.opening_hours
    FOR SELECT USING (true); -- Public needs to see when club is open

CREATE POLICY "Owners can manage opening_hours" ON public.opening_hours
    FOR ALL USING (auth.uid() IN (
        SELECT owner_id FROM public.entities WHERE id = opening_hours.entity_id
    ));

-- Policies for Pricing Rules
CREATE POLICY "Public read access for pricing_rules" ON public.pricing_rules
    FOR SELECT USING (true);

CREATE POLICY "Owners can manage pricing_rules" ON public.pricing_rules
    FOR ALL USING (auth.uid() IN (
        SELECT owner_id FROM public.entities WHERE id = pricing_rules.entity_id
    ));

-- Add Booking Rules columns to Entities
ALTER TABLE public.entities 
ADD COLUMN IF NOT EXISTS default_duration INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS cancellation_window INTEGER DEFAULT 24;
