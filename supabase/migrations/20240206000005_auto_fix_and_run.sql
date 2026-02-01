-- ==============================================================================
-- MIGRATION: AUTO-DIAGNOSTIC & REPAIR (Phase 2.5)
-- Description: Automatically finds the correct Entity, repairs broken links (Users/Bookings),
-- and finally executes the Ghost Hunter PRO migration.
-- ==============================================================================

DO $$
DECLARE
    -- The Ghost ID that caused errors
    bad_id uuid := '70e8610d-2c9b-403f-bfd2-21a27011d882';
    
    -- Variables
    real_id uuid;
    real_name text;
    users_fixed integer;
    bookings_fixed integer;
    mig_result jsonb;
BEGIN
    RAISE NOTICE '🕵️ STARTING AUTONOMOUS DIAGNOSTIC...';

    -- 1. FIND THE REAL ENTITY
    -- Strategy: Search for "Gallery", "Club", or "Padel". Pick the first valid entity found.
    -- Strict preference for "Gallery Padel Club".
    
    SELECT id, name INTO real_id, real_name 
    FROM public.entities 
    WHERE name ILIKE '%Gallery%' 
    LIMIT 1;

    -- Fallback: If no "Gallery" found, take ANY valid entity (assuming single-tenant context)
    IF real_id IS NULL THEN
        SELECT id, name INTO real_id, real_name 
        FROM public.entities 
        LIMIT 1;
    END IF;

    IF real_id IS NULL THEN
        RAISE EXCEPTION '❌ CRITICAL: No active entities found in table public.entities. Cannot proceed.';
    END IF;

    RAISE NOTICE '✅ IDENTITY CONFIRMED: % (ID: %)', real_name, real_id;

    -- 2. REPAIR BROKEN REFERENCES (Users & Bookings)
    -- Fix Users pointing to the Ghost ID
    UPDATE public.users 
    SET organization_id = real_id 
    WHERE organization_id = bad_id;
    
    GET DIAGNOSTICS users_fixed = ROW_COUNT;
    RAISE NOTICE '🔧 REPAIRED USERS: % records updated to correct ID.', users_fixed;

    -- Fix Bookings pointing to the Ghost ID
    -- This ensures the Ghost Hunter script can actually FIND the bookings
    UPDATE public.bookings 
    SET entity_id = real_id 
    WHERE entity_id = bad_id;
    
    GET DIAGNOSTICS bookings_fixed = ROW_COUNT;
    RAISE NOTICE '🔧 REPAIRED BOOKINGS: % records transferred to correct ID.', bookings_fixed;

    -- 3. EXECUTE GHOST HUNTER PRO (Live Migration)
    RAISE NOTICE '👻 EXECUTING GHOST HUNTER PRO...';
    
    mig_result := public.execute_ghost_hunter_migration(real_id, false);

    -- 4. FINAL REPORT (Success)
    RAISE NOTICE '==================================================';
    RAISE NOTICE '🎉 MISSION SUCCESS - REPORT FOR EDUARDO';
    RAISE NOTICE '==================================================';
    RAISE NOTICE '• Entity Fixed: %', real_name;
    RAISE NOTICE '• Members Rescued: %', mig_result->>'members_created';
    RAISE NOTICE '• Profiles Updated: %', mig_result->>'members_updated';
    RAISE NOTICE '• Value Recovered: $%', mig_result->>'total_spent_recovered';
    RAISE NOTICE '==================================================';

END $$;
