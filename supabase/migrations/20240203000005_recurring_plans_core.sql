-- Recurring Plans System
-- Stores subscription/fixed member definitions

CREATE TABLE IF NOT EXISTS public.recurring_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id),
    court_id UUID NOT NULL, -- Logical ID from Entity Config
    day_of_week INT NOT NULL, -- 0-6
    start_time TIME NOT NULL,
    duration_mins INT DEFAULT 90,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_price NUMERIC(10,2) DEFAULT 0, -- Monthly or Total Deal Price
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link Bookings to Plans
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'recurring_plan_id') THEN
        ALTER TABLE public.bookings ADD COLUMN recurring_plan_id UUID REFERENCES public.recurring_plans(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recurring_plans_org ON public.recurring_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_plan_id ON public.bookings(recurring_plan_id);

-- RLS
ALTER TABLE public.recurring_plans ENABLE ROW LEVEL SECURITY;

-- Owner Policy
DROP POLICY IF EXISTS "owners_all_plans" ON public.recurring_plans;
CREATE POLICY "owners_all_plans" ON public.recurring_plans
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('club_owner', 'academy_owner')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role IN ('club_owner', 'academy_owner')
        )
    );

-- Staff Read Policy
DROP POLICY IF EXISTS "staff_read_plans" ON public.recurring_plans;
CREATE POLICY "staff_read_plans" ON public.recurring_plans
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'club_staff'
        )
    );
