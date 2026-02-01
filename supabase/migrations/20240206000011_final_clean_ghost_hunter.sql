-- ==============================================================================
-- SCRIPT 000011: FINAL CLEAN GHOST HUNTER
-- Description: Populates club_members using STRICT column validation.
-- NO INVENTED COLUMNS. ONLY user_id.
-- Target Entity: 70e8610d-2c9b-403f-bfd2-21a279251b1b
-- ==============================================================================

DO $$
DECLARE
    target_entity_id uuid := '70e8610d-2c9b-403f-bfd2-21a279251b1b';
    registered_count integer := 0;
    manual_count integer := 0;
    total_value numeric(10,2);
BEGIN
    RAISE NOTICE '🚀 STARTING CLEAN MIGRATION (ID: %)', target_entity_id;

    -- =======================================================================
    -- PART 1: REGISTERED USERS (Strict JOIN on user_id)
    -- =======================================================================
    WITH RegisteredStats AS (
        SELECT 
            b.user_id,
            COUNT(*) as booking_count,
            SUM(b.price) as total_spent,
            MAX(b.start_time) as last_interaction
        FROM public.bookings b
        WHERE b.entity_id = target_entity_id
          AND b.payment_status IN ('paid', 'approved', 'completed')
          AND b.user_id IS NOT NULL 
        GROUP BY b.user_id
    )
    INSERT INTO public.club_members (
        entity_id, 
        user_id, 
        full_name, 
        phone, 
        email, 
        total_bookings, 
        total_spent, 
        last_interaction_at, 
        status, 
        metadata
    )
    SELECT
        target_entity_id,
        u.id, -- user_id from users table
        COALESCE(u.full_name, 'Usuario Sin Nombre'),
        u.phone,
        u.email,
        s.booking_count,
        COALESCE(s.total_spent, 0),
        s.last_interaction,
        'active',
        jsonb_build_object('source', 'registered_strict_join')
    FROM RegisteredStats s
    JOIN public.users u ON u.id = s.user_id
    ON CONFLICT (entity_id, user_id) DO UPDATE SET
        total_bookings = EXCLUDED.total_bookings,
        total_spent = EXCLUDED.total_spent,
        last_interaction_at = EXCLUDED.last_interaction_at,
        updated_at = now();
        
    GET DIAGNOSTICS registered_count = ROW_COUNT;

    -- =======================================================================
    -- PART 2: MANUAL GHOSTS (Fallback via Title)
    -- =======================================================================
    -- We aggregate by Title to catch manual history.
    WITH ManualStats AS (
        SELECT 
            b.title, 
            COUNT(*) as booking_count,
            SUM(b.price) as total_spent,
            MAX(b.start_time) as last_interaction
        FROM public.bookings b
        WHERE b.entity_id = target_entity_id
          AND b.payment_status IN ('paid', 'approved', 'completed')
          AND b.user_id IS NULL
          AND b.title IS NOT NULL
          AND length(b.title) > 2 
        GROUP BY b.title
    )
    INSERT INTO public.club_members (
        entity_id, 
        full_name, 
        total_bookings, 
        total_spent, 
        last_interaction_at, 
        status, 
        metadata
    )
    SELECT
        target_entity_id,
        m.title, -- Use Title as Name
        m.booking_count,
        COALESCE(m.total_spent, 0),
        m.last_interaction,
        'active',
        jsonb_build_object('source', 'manual_strict_title')
    FROM ManualStats m
    WHERE NOT EXISTS (
        SELECT 1 FROM public.club_members cm 
        WHERE cm.entity_id = target_entity_id 
        AND cm.full_name = m.title
    );

    GET DIAGNOSTICS manual_count = ROW_COUNT;

    -- =======================================================================
    -- REPORT
    -- =======================================================================
    SELECT SUM(total_spent) INTO total_value 
    FROM public.club_members 
    WHERE entity_id = target_entity_id;

    RAISE NOTICE '==================================================';
    RAISE NOTICE '🎉 CLEAN MIGRATION COMPLETED';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ Registered Synced: %', registered_count;
    RAISE NOTICE '📝 Manual Added: %', manual_count;
    RAISE NOTICE '💰 Total Value: $%', COALESCE(total_value, 0);
    RAISE NOTICE '==================================================';

END $$;
