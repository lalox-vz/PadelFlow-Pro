-- Add permissions and job_title columns to users and invitations

-- 1. Alter Users Table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS job_title TEXT;

-- 2. Alter Invitations Table
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS job_title TEXT;

-- 3. Update invite_or_create_pending function
CREATE OR REPLACE FUNCTION invite_or_create_pending(
    p_email TEXT,
    p_organization_id UUID,
    p_role user_role,
    p_permissions JSONB DEFAULT '[]'::jsonb,
    p_job_title TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_invitation_id UUID;
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
            permissions = p_permissions,
            job_title = p_job_title,
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
    else
        -- User doesn't exist - create pending invitation
        INSERT INTO public.invitations (email, role, organization_id, invited_by, permissions, job_title)
        VALUES (p_email, p_role, p_organization_id, auth.uid(), p_permissions, p_job_title)
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

-- 4. Update auto_accept_invitation function
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
            permissions = v_invitation.permissions,
            job_title = v_invitation.job_title,
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
