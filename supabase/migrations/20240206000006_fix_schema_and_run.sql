-- ==============================================================================
-- FIX: ADD MISSING 'DESCRIPTION' COLUMN & RUN GHOST HUNTER
-- ==============================================================================

-- 1. ADD COLUMN (Fixes the schema mismatch)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'description') THEN
        RAISE NOTICE '🔧 Adding missing column: description to public.bookings';
        ALTER TABLE public.bookings ADD COLUMN description text;
    END IF;
END $$;

-- 2. UPDATE FUNCTION (Smarter Phone Extraction Strategy)
-- Now that 'description' exists, we use it. We also scan 'title' as fallback.
CREATE OR REPLACE FUNCTION public.execute_ghost_hunter_migration(target_entity_id uuid, dry_run boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record RECORD;
    raw_phone text;
    clean_phone text;
    final_phone text;
    raw_name text;
    clean_name text;
    
    members_created integer := 0;
    members_updated integer := 0;
    total_spent_recovered numeric(10,2) := 0;
    
    -- Improved Regex: Captures international or local phones (min 7 digits)
    -- Looks for patterns like: "+58 414" or "0414-123.4567"
    phone_pattern text := '(?:\b(?:TLF|Tel|Phone|Tlf|Cel|Movil|Wsp)\b[:.]?\s*)?(\+?\(?\d[\d\s\-\.]{6,}\d)';
BEGIN
    FOR booking_record IN 
        SELECT 
            id, 
            entity_id, 
            title, 
            description, 
            price, 
            start_time, 
            payment_status 
        FROM public.bookings 
        WHERE entity_id = target_entity_id 
        AND user_id IS NULL 
        AND payment_status IN ('paid', 'completed', 'approved')
    LOOP
        raw_name := COALESCE(booking_record.title, 'Cliente Sin Nombre');
        
        -- Priority 1: Check Description (New column, mostly empty but future-proof)
        raw_phone := substring(COALESCE(booking_record.description, '') from phone_pattern);
        
        -- Priority 2: Check Title (Where historical data likely hides)
        IF raw_phone IS NULL THEN
            raw_phone := substring(booking_record.title from phone_pattern);
        END IF;
        
        IF raw_phone IS NULL THEN
            CONTINUE; -- No phone found, cannot identify ghost
        END IF;

        -- Normalize Phone (E.164)
        clean_phone := regexp_replace(raw_phone, '[^\d+]', '', 'g');
        -- Fix common issues (e.g. double plus)
        clean_phone := replace(clean_phone, '++', '+');
        -- Remove leading zero if generic
        IF left(clean_phone, 1) = '0' THEN clean_phone := substring(clean_phone from 2); END IF;
        -- Add Country Code if missing (Default Venezuela +58)
        IF left(clean_phone, 1) <> '+' THEN clean_phone := '+58' || clean_phone; END IF;
        
        final_phone := clean_phone;
        
        -- Clean Name: If title was just the phone, use a placeholder? 
        -- For now, we trust the title has the name too.
        clean_name := trim(regexp_replace(raw_name, phone_pattern, '', 'g')); -- Remove phone from name
        IF length(clean_name) < 2 THEN clean_name := 'Cliente ' || final_phone; END IF;

        -- Upsert Logic
        IF NOT dry_run THEN
            DECLARE
                existing_member_id uuid;
            BEGIN
                SELECT id INTO existing_member_id 
                FROM public.club_members 
                WHERE entity_id = target_entity_id 
                AND phone = final_phone 
                LIMIT 1;

                IF existing_member_id IS NOT NULL THEN
                    UPDATE public.club_members SET
                        total_bookings = total_bookings + 1,
                        total_spent = total_spent + COALESCE(booking_record.price, 0),
                        last_interaction_at = GREATEST(last_interaction_at, booking_record.start_time),
                        updated_at = now()
                    WHERE id = existing_member_id;
                    members_updated := members_updated + 1;
                ELSE
                    INSERT INTO public.club_members (
                        entity_id, full_name, phone, status, 
                        total_bookings, total_spent, last_interaction_at, metadata
                    ) VALUES (
                        target_entity_id, clean_name, final_phone, 'active',
                        1, COALESCE(booking_record.price, 0), booking_record.start_time,
                        jsonb_build_object('source', 'ghost_hunter', 'original_text', booking_record.title)
                    );
                    members_created := members_created + 1;
                END IF;
                total_spent_recovered := total_spent_recovered + COALESCE(booking_record.price, 0);
            END;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'status', 'success',
        'members_created', members_created,
        'members_updated', members_updated,
        'total_spent_recovered', total_spent_recovered
    );
END;
$$;

-- 3. AUTO-EXECUTE FOR GALLERY PADEL CLUB
DO $$
DECLARE
    entity_id uuid;
    res jsonb;
BEGIN
    -- Find Gallery Padel Club
    SELECT id INTO entity_id FROM public.entities WHERE name ILIKE '%Gallery%' LIMIT 1;
    
    -- Fallback safety
    IF entity_id IS NULL THEN 
        SELECT id INTO entity_id FROM public.entities LIMIT 1; 
    END IF;
    
    RAISE NOTICE '🚀 Running Ghost Hunter Fix for Entity: %', entity_id;
    
    res := public.execute_ghost_hunter_migration(entity_id, false);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '   GHOST HUNTER PRO: MISSION REPORT     ';
    RAISE NOTICE '========================================';
    RAISE NOTICE '👻 Members Created: %', res->>'members_created';
    RAISE NOTICE '🔄 Members Updated: %', res->>'members_updated';
    RAISE NOTICE '💰 Value Recovered: $%', res->>'total_spent_recovered';
    RAISE NOTICE '========================================';
END $$;
