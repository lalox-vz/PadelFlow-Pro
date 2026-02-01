-- ==============================================================================
-- PHASE 2: GHOST HUNTER PRO IMPLEMENTATION (Live Migration)
-- Description: Executes the migration logic specifically for Gallery Padel Club.
-- ==============================================================================

DO $$
DECLARE
    -- The corrected Entity ID for Gallery Padel Club
    target_entity_id uuid := '70e8610d-2c9b-403f-bfd2-21a27011d882';
    
    migration_result jsonb;
    entity_exists boolean;
BEGIN
    RAISE NOTICE '🚀 Initiating Ghost Hunter PRO Migration for Entity % ...', target_entity_id;

    -- 1. Final Safety Check
    SELECT EXISTS(SELECT 1 FROM public.entities WHERE id = target_entity_id) INTO entity_exists;
    
    IF NOT entity_exists THEN
        RAISE EXCEPTION '❌ CRITICAL: Entity % does not exist in the new unified table.', target_entity_id;
    END IF;

    -- 2. Execute Migration (Mode: Live)
    migration_result := public.execute_ghost_hunter_migration(target_entity_id, false);

    -- 3. Value Report
    RAISE NOTICE '==================================================';
    RAISE NOTICE '💎 VALUE REPORT (Gallery Padel Club)';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Total Members Identified: %', migration_result->>'members_created';
    RAISE NOTICE 'Existing Profiles Updated: %', migration_result->>'members_updated';
    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE '💰 TOTAL PORTFOLIO VALUE RECOVERED: $%', migration_result->>'total_spent_recovered';
    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE 'Scanned Bookings Status: Success';
    RAISE NOTICE '==================================================';
    
END $$;
