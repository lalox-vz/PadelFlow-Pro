-- UPGRADE: Recurring Plans hybrid support
-- Description: Adds 'member_id' to recurring_plans to support manual club members who don't have an app user_id yet.

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_plans' AND column_name = 'member_id') THEN
        ALTER TABLE public.recurring_plans 
        ADD COLUMN member_id UUID REFERENCES public.club_members(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_recurring_plans_member ON public.recurring_plans(member_id);

-- Update RLS if necessary (Owners already have full access via organization_id, so usually fine)
