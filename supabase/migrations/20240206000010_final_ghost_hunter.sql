-- ==============================================================================
-- PHASE 2 FINAL (REFIXED): GHOST HUNTER PRO (HYBRID EDITION)
-- Description: 
-- 1. Populates club_members from REGISTERED users via strict SQL JOIN.
-- 2. Populates club_members from MANUAL bookings via Title Grouping.
-- Target Entity: 70e8610d-2c9b-403f-bfd2-21a279251b1b
-- ==============================================================================

DO $$
DECLARE
    target_entity_id uuid := '70e8610d-2c9b-403f-bfd2-21a279251b1b';
    registered_count integer := 0;
    manual_count integer := 0;
    total_value numeric(10,2);
BEGIN
    RAISE NOTICE '🚀 STARTING HYBRID COMPREHENSIVE MIGRATION (ID: %)', target_entity_id;

    -- =======================================================================
    -- PART 1: REGISTERED USERS (The Gold Standard)
    -- Source: public.bookings JOIN public.users
    -- =======================================================================
    WITH RegisteredStats AS (
        SELECT 
            user_id,
            COUNT(*) as booking_count,
            SUM(price) as total_spent,
            MAX(start_time) as last_interaction
        FROM public.bookings
        WHERE entity_id = target_entity_id
          AND payment_status IN ('paid', 'approved', 'completed')
          AND user_id IS NOT NULL 
        GROUP BY user_id
    )
    INSERT INTO public.club_members (
        entity_id, user_id, full_name, phone, email, 
        total_bookings, total_spent, last_interaction_at, status, metadata
    )
    SELECT
        target_entity_id,
        u.id, -- user_id
        COALESCE(u.full_name, 'Usuario Sin Nombre'),
        u.phone,
        u.email,
        s.booking_count,
        COALESCE(s.total_spent, 0),
        s.last_interaction,
        'active',
        jsonb_build_object('source', 'registered_join', 'trust_level', 'high')
    FROM RegisteredStats s
    JOIN public.users u ON u.id = s.user_id
    ON CONFLICT (entity_id, user_id) DO UPDATE SET
        total_bookings = EXCLUDED.total_bookings,
        total_spent = EXCLUDED.total_spent,
        last_interaction_at = EXCLUDED.last_interaction_at,
        updated_at = now();
        
    GET DIAGNOSTICS registered_count = ROW_COUNT;

    -- =======================================================================
    -- PART 2: MANUAL GHOSTS (The Hidden Value)
    -- Source: public.bookings WHERE user_id IS NULL
    -- Logic: Group by exact TITLE (Simple Name Match)
    -- =======================================================================
    WITH ManualStats AS (
        SELECT 
            title, -- Using Title as the grouping key
            COUNT(*) as booking_count,
            SUM(price) as total_spent,
            MAX(start_time) as last_interaction
        FROM public.bookings
        WHERE entity_id = target_entity_id
          AND payment_status IN ('paid', 'approved', 'completed')
          AND user_id IS NULL
          AND length(title) > 2 -- Filter noise
        GROUP BY title
    )
    -- We process these row by row to allow fuzzy phone extraction if we wanted,
    -- but for speed and strictness we inserts them as "Name Only" members.
    INSERT INTO public.club_members (
        entity_id, full_name, 
        total_bookings, total_spent, last_interaction_at, status, metadata
    )
    SELECT
        target_entity_id,
        m.title, -- Full Name = Title
        m.booking_count,
        COALESCE(m.total_spent, 0),
        m.last_interaction,
        'active',
        jsonb_build_object('source', 'manual_title_agg', 'trust_level', 'low')
    FROM ManualStats m
    -- Avoid duplicates if this "Name" somehow matches a registered user's name?
    -- Hard to check without phone. We'll insert them. 
    -- If a name is EXACTLY the same, we might want to skip? 
    -- For now, we trust they are distinct because they had no user_id.
    WHERE NOT EXISTS (
        SELECT 1 FROM public.club_members cm 
        WHERE cm.entity_id = target_entity_id 
        AND cm.full_name = m.title -- Simple dedupe check
    );

    GET DIAGNOSTICS manual_count = ROW_COUNT;

    -- =======================================================================
    -- REPORT
    -- =======================================================================
    SELECT SUM(total_spent) INTO total_value 
    FROM public.club_members 
    WHERE entity_id = target_entity_id;

    RAISE NOTICE '==================================================';
    RAISE NOTICE '🎉 HYBRID MIGRATION COMPLETED';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ Registered Members Synced: %', registered_count;
    RAISE NOTICE '� Manual Ghosts Captured: %', manual_count;
    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE '💰 TOTAL PORTFOLIO VALUE: $%', COALESCE(total_value, 0);
    RAISE NOTICE '==================================================';

END $$;
