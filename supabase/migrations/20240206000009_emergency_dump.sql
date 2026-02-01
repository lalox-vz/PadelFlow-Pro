-- ==============================================================================
-- EMERGENCY DIAGNOSTIC: RAW DATA INSPECTION
-- Description: Dumps raw rows to console without filters/assumptions.
-- ==============================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '🚨 EMERGENCY RAW DUMP START 🚨';
    
    FOR rec IN 
        SELECT id, entity_id, user_id, title, description, payment_status 
        FROM public.bookings 
        ORDER BY created_at DESC 
        LIMIT 10
    LOOP
        RAISE NOTICE '------------------------------------------------';
        RAISE NOTICE '🆔 ID: %', rec.id;
        RAISE NOTICE '🏢 Entity: %', rec.entity_id;
        RAISE NOTICE '👤 User: % (Is Null? %)', rec.user_id, (rec.user_id IS NULL);
        RAISE NOTICE '📝 Title: "%"', rec.title;
        RAISE NOTICE '📄 Desc: "%"', COALESCE(rec.description, 'NULL');
        RAISE NOTICE '💰 Status: %', rec.payment_status;
    END LOOP;
    
    RAISE NOTICE '🚨 DUMP END 🚨';
END $$;
