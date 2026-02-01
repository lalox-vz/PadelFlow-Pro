-- =============================================
-- HOST-TENANT LINKING SYSTEM
-- Academies operate INSIDE clubs (Venezuelan model)
-- =============================================

-- Step 1: Add host_club_id to entities table
ALTER TABLE public.entities
ADD COLUMN IF NOT EXISTS host_club_id UUID REFERENCES public.entities(id) ON DELETE CASCADE;

-- Step 2: Add index for performance
CREATE INDEX IF NOT EXISTS idx_entities_host_club ON public.entities(host_club_id);

-- Step 3: Add constraint - only academies can have a host club
ALTER TABLE public.entities
ADD CONSTRAINT check_host_club_only_for_academies
CHECK (
    (type = 'ACADEMY' AND host_club_id IS NOT NULL) OR
    (type = 'CLUB' AND host_club_id IS NULL)
);

-- Step 4: Link academy_classes to club courts/schedules
-- Add court reference to academy_classes
ALTER TABLE public.academy_classes
ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_academy_classes_court ON public.academy_classes(court_id);

-- Step 5: Update RLS policies to allow academies to VIEW club courts
-- Academies can see courts from their host club
CREATE POLICY "Academies can view host club courts"
    ON public.courts FOR SELECT
    USING (
        -- Club owners can see their own courts
        club_id IN (
            SELECT id FROM public.entities 
            WHERE owner_id = auth.uid() AND type = 'CLUB'
        )
        OR
        -- Academy owners can see courts from their host club
        club_id IN (
            SELECT host_club_id FROM public.entities 
            WHERE owner_id = auth.uid() AND type = 'ACADEMY' AND host_club_id IS NOT NULL
        )
    );

-- Step 6: Update RLS for schedules - academies can see host club schedules
CREATE POLICY "Academies can view host club schedules"
    ON public.schedules FOR SELECT
    USING (
        -- Club can see own schedules
        club_id IN (
            SELECT id FROM public.entities 
            WHERE owner_id = auth.uid() AND type = 'CLUB'
        )
        OR
        -- Academy can see host club schedules
        club_id IN (
            SELECT host_club_id FROM public.entities 
            WHERE owner_id = auth.uid() AND type = 'ACADEMY' AND host_club_id IS NOT NULL
        )
    );

-- Step 7: Create view for integrated owners (own both club and academy)
CREATE OR REPLACE VIEW public.user_workspaces AS
SELECT 
    e.id as entity_id,
    e.owner_id,
    e.type as workspace_type,
    e.name as workspace_name,
    e.host_club_id,
    CASE 
        WHEN e.type = 'ACADEMY' THEN hc.name
        ELSE NULL
    END as host_club_name
FROM public.entities e
LEFT JOIN public.entities hc ON e.host_club_id = hc.id
WHERE e.owner_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.user_workspaces TO authenticated;

-- Step 8: Function to check for schedule conflicts
CREATE OR REPLACE FUNCTION check_schedule_conflict(
    p_court_id UUID,
    p_day_of_week INTEGER,
    p_start_time TIME,
    p_duration_minutes INTEGER,
    p_exclude_class_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_end_time TIME;
    v_conflict_count INTEGER;
BEGIN
    -- Calculate end time
    v_end_time := p_start_time + (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Check for conflicts in academy_classes (same court, day, overlapping times)
    SELECT COUNT(*) INTO v_conflict_count
    FROM academy_classes
    WHERE court_id = p_court_id
      AND day_of_week = p_day_of_week
      AND status = 'active'
      AND (p_exclude_class_id IS NULL OR id != p_exclude_class_id)
      AND (
          -- New class starts during existing class
          (p_start_time >= start_time AND p_start_time < start_time + (duration_minutes || ' minutes')::INTERVAL)
          OR
          -- New class ends during existing class
          (v_end_time > start_time AND v_end_time <= start_time + (duration_minutes || ' minutes')::INTERVAL)
          OR
          -- New class completely covers existing class
          (p_start_time <= start_time AND v_end_time >= start_time + (duration_minutes || ' minutes')::INTERVAL)
      );
    
    RETURN v_conflict_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Trigger to prevent overlapping classes
CREATE OR REPLACE FUNCTION prevent_class_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF check_schedule_conflict(
        NEW.court_id,
        NEW.day_of_week,
        NEW.start_time,
        NEW.duration_minutes,
        NEW.id
    ) THEN
        RAISE EXCEPTION 'Schedule conflict: Another class is already scheduled at this time on this court';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_class_overlap_before_insert_update
    BEFORE INSERT OR UPDATE ON public.academy_classes
    FOR EACH ROW
    WHEN (NEW.court_id IS NOT NULL)
    EXECUTE FUNCTION prevent_class_overlap();

-- Step 10: Comments for documentation
COMMENT ON COLUMN entities.host_club_id IS 'For academies only: references the club where they operate';
COMMENT ON FUNCTION check_schedule_conflict IS 'Checks if a class would conflict with existing classes on the same court/day/time';
COMMENT ON VIEW user_workspaces IS 'Shows all workspaces (clubs and academies) owned by the current user';
