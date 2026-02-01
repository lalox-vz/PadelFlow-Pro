-- ==============================================================================
-- MIGRATION: GHOST HUNTER PRO (Fase 2)
-- Description: Extracts manual identity from bookings, normalizes phones to E.164,
-- and hydrates the 'club_members' CRM table with historical value.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.execute_ghost_hunter_migration(target_club_id uuid, dry_run boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    booking_record RECORD;
    
    -- Variables for parsing
    raw_phone text;
    clean_phone text;
    final_phone text;
    raw_name text;
    clean_name text;
    
    -- Stats
    members_created integer := 0;
    members_updated integer := 0;
    total_spent_recovered numeric(10,2) := 0;
    failed_entries integer := 0;
    
    -- Regex for phone extraction (looks for "TLF: ...", "Tel: ...", or just numbers if strict format used)
    -- We assume the description format we implemented: "TLF: +58..."
    phone_pattern text := '(?:TLF|Tel|Phone|Tlf):\s*([+\d\s\-\(\)]+)';
    
BEGIN
    RAISE NOTICE 'Starting Ghost Hunter Migration for Club: %', target_club_id;

    -- Loop through all bookings for this club that are completed/paid
    -- We prioritize bookings with user_id NULL (Manual guests)
    -- But we can also index registered users stats if we want (Phase 1 trigger handles new ones, this handles logic for manual)
    
    FOR booking_record IN 
        SELECT 
            id, 
            title, 
            description, 
            price, 
            start_time, 
            payment_status,
            created_at
        FROM public.bookings 
        WHERE entity_id = target_club_id
        AND user_id IS NULL -- Only Manual Bookings for now
        AND payment_status IN ('paid', 'completed', 'approved')
    LOOP
        -- 1. EXTRACT RAW DATA
        raw_name := COALESCE(booking_record.title, 'Cliente Sin Nombre');
        
        -- Try to extract phone from description
        raw_phone := substring(booking_record.description from phone_pattern);
        
        -- If no phone found in description, we can't reliably normalize identity.
        -- We skip specific CRM creation for "Anonymous" bookings to avoid littering the DB,
        -- OR we create a "Name-only" member (Risky for "Andres").
        -- Per instructions: "Using the normalized phone to create unique records".
        -- So if NO phone is found, we SKIP creating a member for now (treated as anonymous walk-in).
        
        IF raw_phone IS NULL THEN
            failed_entries := failed_entries + 1;
            CONTINUE;
        END IF;

        -- 2. NORMALIZE PHONE (E.164 Logic)
        -- Remove all non-numeric characters except '+'
        clean_phone := regexp_replace(raw_phone, '[^\d+]', '', 'g');
        
        -- Logic: If starts with '0', remove it.
        IF left(clean_phone, 1) = '0' THEN
            clean_phone := substring(clean_phone from 2);
        END IF;
        
        -- Logic: If not starts with '+', assume Venezuela (+58)
        IF left(clean_phone, 1) <> '+' THEN
            -- Check length or just default prepend
            -- If length is 10 (e.g. 4141234567), perfect.
            clean_phone := '+58' || clean_phone;
        END IF;
        
        final_phone := clean_phone;
        clean_name := trim(raw_name);

        -- 3. UPSERT INTO CLUB_MEMBERS
        -- We use phone + club_id as the unique constraint key essentially (logic-wise), 
        -- but the DB table has (club_id, user_id) unique constraint.
        -- It does NOT yet have a unique constraint on (club_id, phone) for manual users.
        -- We should probably check if a member exists with this phone.
        
        IF NOT dry_run THEN
            -- Check via Phone Lookup first
            DECLARE
                existing_member_id uuid;
            BEGIN
                SELECT id INTO existing_member_id 
                FROM public.club_members 
                WHERE club_id = target_club_id 
                AND phone = final_phone 
                LIMIT 1;

                IF existing_member_id IS NOT NULL THEN
                    -- UPDATE EXISTING
                    UPDATE public.club_members SET
                        total_bookings = total_bookings + 1,
                        total_spent = total_spent + COALESCE(booking_record.price, 0),
                        last_interaction_at = GREATEST(last_interaction_at, booking_record.start_time),
                        updated_at = now()
                    WHERE id = existing_member_id;
                    
                    members_updated := members_updated + 1;
                ELSE
                    -- CREATE NEW GHOST MEMBER
                    INSERT INTO public.club_members (
                        club_id,
                        full_name,
                        phone,
                        status,
                        total_bookings,
                        total_spent,
                        last_interaction_at,
                        metadata
                    ) VALUES (
                        target_club_id,
                        clean_name,
                        final_phone,
                        'active',
                        1, -- Initial count
                        COALESCE(booking_record.price, 0), -- Initial spent
                        booking_record.start_time,
                        jsonb_build_object('source', 'migration_v1', 'normalized', true)
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
        'total_spent_recovered', total_spent_recovered,
        'failed_entries', failed_entries
    );
END;
$$;
