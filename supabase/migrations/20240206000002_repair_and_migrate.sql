-- ==============================================================================
-- REPAIR & MIGRATE SCRIPT
-- Description: 
-- 1. Fixes integrity by ensuring the Organization exists.
-- 2. Executes the Ghost Hunter CRM Migration.
-- ==============================================================================

DO $$
DECLARE
    target_org_id uuid := '70e8610d-2c9b-403f-bfd2-21a27011d882';
    exists_check boolean;
    migration_result jsonb;
BEGIN
    -- 1. INTEGRITY CHECK & REPAIR
    SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = target_org_id) INTO exists_check;
    
    IF NOT exists_check THEN
        RAISE NOTICE '⚠️ Organization % not found. Creating placeholder to restore integrity...', target_org_id;
        
        INSERT INTO public.organizations (id, name, created_at)
        VALUES (target_org_id, 'PadelFlow Principal (Restored)', now());
        
        RAISE NOTICE '✅ Organization restored successfully.';
    ELSE
        RAISE NOTICE '✅ Organization % exists. Proceeding...', target_org_id;
    END IF;

    -- 2. EXECUTE PHANTOM HUNTER MIGRATION (REAL MODE)
    -- Using the function we defined in the previous step
    RAISE NOTICE '👻 Starting Ghost Hunter Migration...';
    
    migration_result := public.execute_ghost_hunter_migration(target_org_id, false);
    
    -- 3. REPORT
    RAISE NOTICE '==================================================';
    RAISE NOTICE '📊 MIGRATION REPORT';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Status: %', migration_result->>'status';
    RAISE NOTICE 'Members Created: %', migration_result->>'members_created';
    RAISE NOTICE 'Members Updated: %', migration_result->>'members_updated';
    RAISE NOTICE 'Money Recovered: $%', migration_result->>'total_spent_recovered';
    RAISE NOTICE 'Failed Entries (No Phone): %', migration_result->>'failed_entries';
    RAISE NOTICE '==================================================';
    
END $$;
