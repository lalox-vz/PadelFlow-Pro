-- ==============================================================================
-- MIGRATION: ARCHITECTURE UNIFICATION & CLEANUP
-- Description: Consolidates 'public.entities' as the single source of truth.
-- Removes legacy 'organizations' table and zombie tables.
-- Rebuilds CRM 'club_members' linked correctly to 'entities'.
-- ==============================================================================

BEGIN;

    -- 1. VERIFY ENTITIES TABLE (The King)
    -- We assume it exists based on the diagnosis. We do not touch it.

    -- 2. FIX USERS RELATIONSHIP
    -- The column 'organization_id' in users is widely used in frontend. We keep the name 
    -- but repoint the Foreign Key to 'public.entities'.
    
    -- Drop old constraint if it exists (pointing to organizations)
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;
    
    -- Add new constraint pointing to entities
    -- We use ON DELETE SET NULL to prevent wiping users if an entity is removed
    ALTER TABLE public.users 
    ADD CONSTRAINT users_entity_id_fkey 
    FOREIGN KEY (organization_id) 
    REFERENCES public.entities(id) 
    ON DELETE SET NULL;

    -- 3. REBUILD CRM TABLE (club_members) -> (entity_members)?
    -- To keep it semantic with "Entities", we will define it as 'club_members' 
    -- but linked to 'entity_id'.
    
    DROP TABLE IF EXISTS public.club_members CASCADE;
    
    CREATE TABLE public.club_members (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        entity_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL, -- The new anchor
        user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
        
        -- Identity
        full_name text NOT NULL,
        phone text, -- Master Search Key (Indexed)
        email text,
        
        -- CRM Status
        status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned', 'vip')),
        
        -- Business Data
        notes text,
        total_bookings integer DEFAULT 0,
        total_spent numeric(10,2) DEFAULT 0,
        last_interaction_at timestamptz,
        
        -- Social / Flex
        metadata jsonb DEFAULT '{}'::jsonb,
        
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        
        UNIQUE(entity_id, user_id)
    );

    -- Indexes
    CREATE INDEX idx_club_members_phone ON public.club_members(phone);
    CREATE INDEX idx_club_members_entity_id ON public.club_members(entity_id);
    CREATE INDEX idx_club_members_search ON public.club_members USING GIN (
        to_tsvector('simple', full_name || ' ' || coalesce(phone, '') || ' ' || coalesce(email, ''))
    );

    -- RLS
    ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Entities manage their own members" ON public.club_members
        FOR ALL USING (
            entity_id IN (
                SELECT organization_id FROM public.users WHERE id = auth.uid()
            )
        );

    -- 4. UPDATE SYNC TRIGGER
    CREATE OR REPLACE FUNCTION public.sync_user_to_club_member()
    RETURNS TRIGGER 
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        -- Sync triggers when a user is related to an organization (entity)
        IF NEW.organization_id IS NOT NULL THEN
            INSERT INTO public.club_members (
                entity_id,
                user_id,
                full_name,
                email,
                phone,
                status,
                metadata,
                created_at
            )
            VALUES (
                NEW.organization_id, -- Maps to entity_id
                NEW.id,
                COALESCE(NEW.full_name, 'Usuario Sin Nombre'),
                NEW.email,
                NEW.phone,
                'active',
                '{"source": "auto_sync", "privacy": "default"}'::jsonb,
                NEW.created_at
            )
            ON CONFLICT (entity_id, user_id) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                email = EXCLUDED.email,
                phone = EXCLUDED.phone,
                updated_at = now();
        END IF;
        RETURN NEW;
    END;
    $$;
    
    -- Re-attach trigger
    DROP TRIGGER IF EXISTS on_user_sync_crm ON public.users;
    CREATE TRIGGER on_user_sync_crm
        AFTER INSERT OR UPDATE ON public.users
        FOR EACH ROW
        EXECUTE FUNCTION public.sync_user_to_club_member();

    -- 5. UPDATED MIGRATION TOOL (Ghost Hunter V2)
    -- Adapted for 'entities' and 'entity_id'
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
        failed_entries integer := 0;
        
        phone_pattern text := '(?:TLF|Tel|Phone|Tlf):\s*([+\d\s\-\(\)]+)';
    BEGIN
        FOR booking_record IN 
            SELECT * FROM public.bookings 
            WHERE entity_id = target_entity_id -- Now definitely using entity_id
            AND user_id IS NULL 
            AND payment_status IN ('paid', 'completed', 'approved')
        LOOP
            raw_name := COALESCE(booking_record.title, 'Cliente Sin Nombre');
            raw_phone := substring(booking_record.description from phone_pattern);
            
            IF raw_phone IS NULL THEN
                failed_entries := failed_entries + 1;
                CONTINUE;
            END IF;

            -- Cleanup
            clean_phone := regexp_replace(raw_phone, '[^\d+]', '', 'g');
            IF left(clean_phone, 1) = '0' THEN clean_phone := substring(clean_phone from 2); END IF;
            IF left(clean_phone, 1) <> '+' THEN clean_phone := '+58' || clean_phone; END IF;
            final_phone := clean_phone;
            clean_name := trim(raw_name);

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
            'total_spent_recovered', total_spent_recovered
        );
    END;
    $$;

    -- 6. DROP ZOMBIE TABLES (The final cleanup)
    DROP TABLE IF EXISTS public.registrations CASCADE;
    DROP TABLE IF EXISTS public.trainings CASCADE;
    DROP TABLE IF EXISTS public.memberships CASCADE;
    -- Drop organizations last as it might be referenced by things we just fixed
    DROP TABLE IF EXISTS public.organizations CASCADE;

COMMIT;
