-- 1. Update role type to include full hierarchy

-- Step 1: Add temporary column to store old values
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_temp TEXT;

-- Step 2: Copy current role values to temp column
UPDATE public.users SET role_temp = role::TEXT;

-- Step 3: Drop the old role column
ALTER TABLE public.users DROP COLUMN role;

-- Step 4: Drop and recreate the enum type
DROP TYPE IF EXISTS user_role CASCADE;

CREATE TYPE user_role AS ENUM (
    'platform_admin',
    'club_owner',
    'academy_owner',
    'club_staff',
    'coach',
    'player',
    'student'
);

-- Step 5: Add role column back with new type
ALTER TABLE public.users ADD COLUMN role user_role;

-- Step 6: Migrate data with proper mapping
UPDATE public.users 
SET role = CASE 
    WHEN role_temp = 'admin' THEN 'platform_admin'::user_role
    WHEN role_temp = 'super_admin' THEN 'platform_admin'::user_role
    WHEN role_temp = 'owner' THEN 'club_owner'::user_role
    WHEN role_temp = 'club_owner' THEN 'club_owner'::user_role
    WHEN role_temp = 'academy_owner' THEN 'academy_owner'::user_role
    WHEN role_temp = 'client' THEN 'player'::user_role
    WHEN role_temp = 'player' THEN 'player'::user_role
    WHEN role_temp = 'coach' THEN 'coach'::user_role
    WHEN role_temp = 'student' THEN 'student'::user_role
    WHEN role_temp = 'club_staff' THEN 'club_staff'::user_role
    ELSE 'player'::user_role
END;

-- Step 7: Set default and make not null
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'player'::user_role;
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- Step 8: Drop temporary column
ALTER TABLE public.users DROP COLUMN role_temp;

-- 2. Create booking_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.booking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'created', 'updated', 'cancelled', 'payment_updated'
    notes TEXT, -- Details about what changed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_booking_logs_booking_id ON public.booking_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_logs_created_at ON public.booking_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.booking_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for booking_logs

-- Platform admins can see all logs
CREATE POLICY "platform_admins_view_all_logs" ON public.booking_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'platform_admin'
        )
    );

-- Owners and staff can see logs for their organization's bookings
CREATE POLICY "org_users_view_org_logs" ON public.booking_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.bookings b ON b.id = booking_logs.booking_id
            WHERE u.id = auth.uid()
            AND u.organization_id = b.entity_id
            AND u.role IN ('club_owner', 'academy_owner', 'club_staff')
        )
    );

-- Allow authenticated users to insert logs
CREATE POLICY "authenticated_users_insert_logs" ON public.booking_logs
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Enhanced RLS for bookings table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_can_view_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "users_can_insert_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "users_can_update_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "users_can_delete_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "platform_admins_all_bookings" ON public.bookings;
DROP POLICY IF EXISTS "org_users_manage_org_bookings" ON public.bookings;
DROP POLICY IF EXISTS "players_manage_own_bookings" ON public.bookings;

-- Platform admins can do everything
CREATE POLICY "platform_admins_all_bookings" ON public.bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'platform_admin'
        )
    );

-- Owners and staff can manage their organization's bookings
CREATE POLICY "org_users_manage_org_bookings" ON public.bookings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.organization_id = bookings.entity_id
            AND users.role IN ('club_owner', 'academy_owner', 'club_staff')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.organization_id = bookings.entity_id
            AND users.role IN ('club_owner', 'academy_owner', 'club_staff')
        )
    );

-- Players can view and manage their own bookings
CREATE POLICY "players_manage_own_bookings" ON public.bookings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Enhanced RLS for entities table

-- Drop existing policies
DROP POLICY IF EXISTS "owners_can_view_own_entity" ON public.entities;
DROP POLICY IF EXISTS "owners_can_update_own_entity" ON public.entities;
DROP POLICY IF EXISTS "platform_admins_all_entities" ON public.entities;
DROP POLICY IF EXISTS "org_users_manage_entity" ON public.entities;
DROP POLICY IF EXISTS "public_can_view_entities" ON public.entities;

-- Platform admins can see all entities
CREATE POLICY "platform_admins_all_entities" ON public.entities
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'platform_admin'
        )
    );

-- Owners and staff can manage their entity
CREATE POLICY "org_users_manage_entity" ON public.entities
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.organization_id = entities.id
            AND users.role IN ('club_owner', 'academy_owner', 'club_staff')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.organization_id = entities.id
            AND users.role IN ('club_owner', 'academy_owner', 'club_staff')
        )
    );

-- Anyone can view entities (for browsing/booking)
CREATE POLICY "public_can_view_entities" ON public.entities
    FOR SELECT
    USING (true);

-- 6. Function to automatically log booking changes

CREATE OR REPLACE FUNCTION log_booking_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.booking_logs (booking_id, user_id, action, notes)
        VALUES (
            NEW.id,
            auth.uid(),
            'created',
            'Reserva creada para ' || COALESCE(NEW.title, 'Sin nombre')
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Detect what changed
        DECLARE
            changes TEXT := '';
        BEGIN
            IF OLD.title != NEW.title THEN
                changes := changes || 'Nombre: ' || OLD.title || ' → ' || NEW.title || '. ';
            END IF;
            IF OLD.payment_status != NEW.payment_status THEN
                changes := changes || 'Pago: ' || OLD.payment_status || ' → ' || NEW.payment_status || '. ';
            END IF;
            IF OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time THEN
                changes := changes || 'Horario modificado. ';
            END IF;
            IF OLD.court_id != NEW.court_id THEN
                changes := changes || 'Cancha cambiada. ';
            END IF;
            
            INSERT INTO public.booking_logs (booking_id, user_id, action, notes)
            VALUES (
                NEW.id,
                auth.uid(),
                'updated',
                changes
            );
        END;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.booking_logs (booking_id, user_id, action, notes)
        VALUES (
            OLD.id,
            auth.uid(),
            'cancelled',
            'Reserva cancelada'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS booking_audit_trigger ON public.bookings;
CREATE TRIGGER booking_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION log_booking_change();

-- 7. Assign specific roles to existing users

-- Platform admin (only if exists)
UPDATE public.users 
SET role = 'platform_admin'
WHERE email = 'eduardogarciavega92@gmail.com'
  AND EXISTS (SELECT 1 FROM public.users WHERE email = 'eduardogarciavega92@gmail.com');

-- Club owner (only if exists)
UPDATE public.users 
SET role = 'club_owner'
WHERE email = 'carlos@gmail.com'
  AND EXISTS (SELECT 1 FROM public.users WHERE email = 'carlos@gmail.com');

-- 8. Function to invite users to organization (for multi-owner support)

CREATE OR REPLACE FUNCTION invite_user_to_organization(
    p_email TEXT,
    p_organization_id UUID,
    p_role user_role
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    -- Check if inviter has permission (must be owner of the organization)
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND organization_id = p_organization_id
        AND role IN ('club_owner', 'academy_owner', 'platform_admin')
    ) THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso para invitar usuarios');
    END IF;

    -- Find user by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;

    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
    END IF;

    -- Update user's organization and role
    UPDATE public.users
    SET 
        organization_id = p_organization_id,
        role = p_role,
        has_business = true,
        business_type = CASE 
            WHEN p_role IN ('club_owner', 'club_staff') THEN 'club'
            WHEN p_role IN ('academy_owner') THEN 'academy'
            ELSE business_type
        END
    WHERE id = v_user_id;

    RETURN json_build_object(
        'success', true,
        'user_id', v_user_id,
        'message', 'Usuario invitado exitosamente'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION invite_user_to_organization TO authenticated;

COMMENT ON TABLE public.booking_logs IS 'Audit trail for all booking changes';
COMMENT ON FUNCTION log_booking_change() IS 'Automatically logs booking creation, updates, and deletions';
COMMENT ON FUNCTION invite_user_to_organization IS 'Allows club owners to invite partners and staff to their organization';
