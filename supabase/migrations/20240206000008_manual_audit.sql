-- ==============================================================================
-- AUDIT REPORT: BOOKING DATA PATTERNS (FIXED)
-- Description: Analyzes the last 20 bookings to understand real data entry habits.
-- ==============================================================================

DO $$
DECLARE
    target_entity_id uuid; -- Renamed variable to avoid ambiguity with column 'entity_id'
    rec RECORD;
    has_phones integer := 0;
    pure_names integer := 0;
    mixed_format integer := 0;
BEGIN
    SELECT id INTO target_entity_id FROM public.entities WHERE name ILIKE '%Gallery%' LIMIT 1;
    IF target_entity_id IS NULL THEN SELECT id INTO target_entity_id FROM public.entities LIMIT 1; END IF;

    RAISE NOTICE '🔍 AUDIT STARTING FOR ENTITY: %', target_entity_id;
    RAISE NOTICE '------------------------------------------------';

    FOR rec IN 
        SELECT title, description FROM public.bookings 
        WHERE public.bookings.entity_id = target_entity_id -- Explicit table qualification
        AND user_id IS NULL -- Manual
        ORDER BY created_at DESC 
        LIMIT 20
    LOOP
        RAISE NOTICE '• Title: "%" | Desc: "%"', rec.title, COALESCE(rec.description, 'NULL');
        
        -- Basic heuristics
        IF rec.title ~ '\d{4}' OR COALESCE(rec.description, '') ~ '\d{4}' THEN
            has_phones := has_phones + 1;
        ELSE
            pure_names := pure_names + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '------------------------------------------------';
    RAISE NOTICE '📊 SUMMARY (Last Sample)';
    RAISE NOTICE '• Entries with Potential Phones: %', has_phones;
    RAISE NOTICE '• Entries with Only Names: %', pure_names;
    RAISE NOTICE '------------------------------------------------';

END $$;
