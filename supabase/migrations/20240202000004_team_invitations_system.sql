-- ================================================
-- Team Invitations System
-- ================================================

-- ================================================
-- STEP 1: Create invitations table
-- ================================================

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role user_role NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    
    -- Prevent duplicate pending invitations for same email to same org
    UNIQUE(email, organization_id, status)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 2: RLS Policies for invitations
-- ================================================

-- Organization members can view their org's invitations
CREATE POLICY "org_members_view_invitations" 
ON public.invitations 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.organization_id = invitations.organization_id
        AND users.role IN ('club_owner', 'academy_owner', 'platform_admin')
    )
);

-- Organization owners can create invitations
CREATE POLICY "org_owners_create_invitations" 
ON public.invitations 
FOR INSERT 
TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.organization_id = invitations.organization_id
        AND users.role IN ('club_owner', 'academy_owner', 'platform_admin')
    )
);

-- Organization owners can update/delete their invitations
CREATE POLICY "org_owners_manage_invitations" 
ON public.invitations 
FOR ALL
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.organization_id = invitations.organization_id
        AND users.role IN ('club_owner', 'academy_owner', 'platform_admin')
    )
);

-- ================================================
-- STEP 3: Function to invite or create pending invitation
-- ================================================

CREATE OR REPLACE FUNCTION invite_or_create_pending(
    p_email TEXT,
    p_organization_id UUID,
    p_role user_role
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_invitation_id UUID;
    v_result JSON;
BEGIN
    -- Check if inviter has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND organization_id = p_organization_id
        AND role IN ('club_owner', 'academy_owner', 'platform_admin')
    ) THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'No tienes permiso para invitar usuarios',
            'type', 'permission_denied'
        );
    END IF;

    -- Check if user exists
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = p_email;

    IF v_user_id IS NOT NULL THEN
        -- User exists - update their organization and role immediately
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
            'type', 'existing_user',
            'user_id', v_user_id,
            'message', 'Usuario añadido inmediatamente al equipo'
        );
    ELSE
        -- User doesn't exist - create pending invitation
        INSERT INTO public.invitations (email, role, organization_id, invited_by)
        VALUES (p_email, p_role, p_organization_id, auth.uid())
        RETURNING id INTO v_invitation_id;

        RETURN json_build_object(
            'success', true,
            'type', 'pending_invitation',
            'invitation_id', v_invitation_id,
            'message', 'Invitación creada. El usuario será añadido cuando se registre.'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION invite_or_create_pending TO authenticated;

-- ================================================
-- STEP 4: Auto-accept trigger when user registers
-- ================================================

CREATE OR REPLACE FUNCTION auto_accept_invitation()
RETURNS TRIGGER AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Look for pending invitation with this email
    SELECT * INTO v_invitation
    FROM public.invitations
    WHERE email = NEW.email
    AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invitation IS NOT NULL THEN
        -- Update user with invitation details
        UPDATE public.users
        SET 
            organization_id = v_invitation.organization_id,
            role = v_invitation.role,
            has_business = true,
            business_type = CASE 
                WHEN v_invitation.role IN ('club_owner', 'club_staff') THEN 'club'
                WHEN v_invitation.role IN ('academy_owner') THEN 'academy'
                ELSE null
            END
        WHERE id = NEW.id;

        -- Mark invitation as accepted
        UPDATE public.invitations
        SET 
            status = 'accepted',
            accepted_at = NOW()
        WHERE id = v_invitation.id;

        RAISE NOTICE 'Auto-accepted invitation for % to organization %', NEW.email, v_invitation.organization_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on users table (fires after insert)
DROP TRIGGER IF EXISTS trigger_auto_accept_invitation ON public.users;
CREATE TRIGGER trigger_auto_accept_invitation
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION auto_accept_invitation();

-- ================================================
-- STEP 5: Function to cancel invitation
-- ================================================

CREATE OR REPLACE FUNCTION cancel_invitation(p_invitation_id UUID)
RETURNS JSON AS $$
DECLARE
    v_invitation RECORD;
BEGIN
    -- Get invitation details
    SELECT * INTO v_invitation
    FROM public.invitations
    WHERE id = p_invitation_id;

    IF v_invitation IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Invitación no encontrada');
    END IF;

    -- Check permission
    IF NOT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND organization_id = v_invitation.organization_id
        AND role IN ('club_owner', 'academy_owner', 'platform_admin')
    ) THEN
        RETURN json_build_object('success', false, 'error', 'No tienes permiso');
    END IF;

    -- Mark as cancelled instead of deleting (for audit trail)
    UPDATE public.invitations
    SET status = 'cancelled'
    WHERE id = p_invitation_id;

    RETURN json_build_object('success', true, 'message', 'Invitación cancelada');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_invitation TO authenticated;

-- ================================================
-- STEP 6: Verification
-- ================================================

DO $$
DECLARE
    table_count INT;
    policy_count INT;
    function_count INT;
BEGIN
    -- Check table
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name = 'invitations';
    
    -- Check policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'invitations';
    
    -- Check functions
    SELECT COUNT(*) INTO function_count
    FROM pg_proc 
    WHERE proname IN ('invite_or_create_pending', 'auto_accept_invitation', 'cancel_invitation');
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'INVITATIONS SYSTEM VERIFICATION:';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Table created: %', CASE WHEN table_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'RLS policies: % created', policy_count;
    RAISE NOTICE 'Functions: % created', function_count;
    RAISE NOTICE '====================================';
    
    IF table_count = 0 OR function_count < 3 THEN
        RAISE EXCEPTION '❌ Setup incomplete';
    ELSE
        RAISE NOTICE '✅ Invitations system ready!';
    END IF;
END $$;

COMMENT ON TABLE public.invitations IS 'Pending team invitations for users who havent registered yet';
COMMENT ON FUNCTION invite_or_create_pending IS 'Invite user if exists, or create pending invitation';
COMMENT ON FUNCTION auto_accept_invitation IS 'Automatically accepts invitation when user registers';
COMMENT ON FUNCTION cancel_invitation IS 'Cancels a pending invitation';
