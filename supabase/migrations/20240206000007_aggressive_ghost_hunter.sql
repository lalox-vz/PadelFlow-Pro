-- ==============================================================================
-- GHOST HUNTER PRO V3: AGGRESSIVE CAPTURE
-- Description: Adjusted regex to be extremely permissive. Creates members even 
-- with just a Name if no phone is found, to ensure CRM population.
-- ==============================================================================

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
    
    -- Regex V3: Finds any sequence of digits long enough to be a phone (7+ digits)
    -- Ignoring common separators
    phone_pattern text := '(\+?\d[\d\-\. ]{7,})';
BEGIN
    -- Loop through ALL non-user completed bookings
    FOR booking_record IN 
        SELECT 
            id, 
            entity_id, 
            title, 
            description, 
            price, 
            start_time 
        FROM public.bookings 
        WHERE entity_id = target_entity_id 
        AND user_id IS NULL -- Manual Only
        AND payment_status IN ('paid', 'completed', 'approved')
    LOOP
        -- 1. Extract Name (Use title as base)
        raw_name := COALESCE(booking_record.title, 'Cliente Manual');
        
        -- Skip system/generic titles if they have no other info
        IF raw_name ILIKE '%Reserva%' AND raw_name ILIKE '%Padel%' THEN
            -- Try description as name if title is generic
            IF booking_record.description IS NOT NULL AND length(booking_record.description) > 3 THEN
                raw_name := booking_record.description;
            END IF;
        END IF;

        -- 2. Extract Phone (Aggressive Scan)
        -- Check Title first (often "Juan 0412...")
        raw_phone := substring(raw_name from phone_pattern);
        
        -- If not in title, check description
        IF raw_phone IS NULL AND booking_record.description IS NOT NULL THEN
            raw_phone := substring(booking_record.description from phone_pattern);
        END IF;

        -- 3. Normalize Phone (Best Effort)
        IF raw_phone IS NOT NULL THEN
            clean_phone := regexp_replace(raw_phone, '[^\d+]', '', 'g');
            -- Remove generic zero prefix
            IF left(clean_phone, 1) = '0' THEN clean_phone := substring(clean_phone from 2); END IF;
            -- Assume VZLA default
            IF left(clean_phone, 1) <> '+' AND length(clean_phone) <= 11 THEN 
                clean_phone := '+58' || clean_phone; 
            END IF;
            final_phone := clean_phone;
            
            -- Clean Name: Remove the phone part from the name string
            -- E.g. "Juan 0412-123" -> "Juan"
            clean_name := trim(regexp_replace(raw_name, phone_pattern, '', 'g'));
            -- Remove trailing separators like " - "
            clean_name := trim(regexp_replace(clean_name, '[-:]$', '', 'g'));
        ELSE
            -- NO PHONE FOUND: Create "Name Only" Identity
            -- We flag this in metadata so we know it's incomplete
            final_phone := NULL;
            clean_name := trim(raw_name);
        END IF;

        -- Validate Name isn't empty/garbage
        IF length(clean_name) < 2 THEN clean_name := 'Cliente M-' || left(md5(random()::text), 4); END IF;

        -- 4. UPSERT STRATEGY
        IF NOT dry_run THEN
            DECLARE
                existing_member_id uuid;
            BEGIN
                -- Strategy A: Match by Phone (Strong Match)
                IF final_phone IS NOT NULL THEN
                    SELECT id INTO existing_member_id FROM public.club_members 
                    WHERE entity_id = target_entity_id AND phone = final_phone LIMIT 1;
                -- Strategy B: Match by Name (Weak Match - Fallback)
                ELSE
                    SELECT id INTO existing_member_id FROM public.club_members 
                    WHERE entity_id = target_entity_id AND full_name ILIKE clean_name LIMIT 1;
                END IF;

                IF existing_member_id IS NOT NULL THEN
                    -- Update existing
                    UPDATE public.club_members SET
                        total_bookings = total_bookings + 1,
                        total_spent = total_spent + COALESCE(booking_record.price, 0),
                        last_interaction_at = GREATEST(last_interaction_at, booking_record.start_time),
                        updated_at = now()
                    WHERE id = existing_member_id;
                    members_updated := members_updated + 1;
                ELSE
                    -- Create New
                    INSERT INTO public.club_members (
                        entity_id, full_name, phone, status, 
                        total_bookings, total_spent, last_interaction_at, metadata
                    ) VALUES (
                        target_entity_id, 
                        clean_name, 
                        final_phone, 
                        'active',
                        1, 
                        COALESCE(booking_record.price, 0), 
                        booking_record.start_time,
                        jsonb_build_object('source', 'ghost_hunter_v3', 'has_phone', (final_phone IS NOT NULL))
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

-- Run it immediately for Gallery Padel Club
DO $$
DECLARE
    entity_id uuid;
    res jsonb;
BEGIN
    SELECT id INTO entity_id FROM public.entities WHERE name ILIKE '%Gallery%' LIMIT 1;
    IF entity_id IS NULL THEN SELECT id INTO entity_id FROM public.entities LIMIT 1; END IF;
    
    RAISE NOTICE '🚀 GHOST HUNTER V3 (Aggressive Mode) Running for: %', entity_id;
    res := public.execute_ghost_hunter_migration(entity_id, false);
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '👻 Members Created: %', res->>'members_created';
    RAISE NOTICE '🔄 Members Updated: %', res->>'members_updated';
    RAISE NOTICE '💰 Value Recovered: $%', res->>'total_spent_recovered';
    RAISE NOTICE '========================================';
END $$;
