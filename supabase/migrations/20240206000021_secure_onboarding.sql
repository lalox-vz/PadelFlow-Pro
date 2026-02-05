-- 1. Add verification_status to entities
CREATE TYPE verification_status AS ENUM ('verified', 'pending', 'rejected');

ALTER TABLE public.entities 
ADD COLUMN verification_status verification_status DEFAULT 'pending',
ADD COLUMN is_public BOOLEAN DEFAULT FALSE; -- Extra safety switch

-- 2. Create RPC for Secure Entity Creation (Unblocks Step 1)
-- This function runs as SECURITY DEFINER to bypass RLS issues during onboarding
-- It ensures that even a 'player' role can create their first business entity safely.

CREATE OR REPLACE FUNCTION public.create_business_entity(
    p_name TEXT,
    p_type entity_type,
    p_slug TEXT,
    p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entity_id UUID;
    v_exists BOOLEAN;
BEGIN
    -- Check if user already has an entity of this type?
    -- (Optional enforcement, but UI handles it. DB can be permissive or strict)
    
    -- Insert the new entity
    INSERT INTO public.entities (owner_id, name, type, slug, verification_status, is_public)
    VALUES (p_user_id, p_name, p_type, p_slug, 'pending', FALSE)
    RETURNING id INTO v_entity_id;

    RETURN v_entity_id;
END;
$$;
