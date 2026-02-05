-- CRITICAL FIX: Purify the creation process
-- 1. Ensure `create_business_entity` is absolutely pure and ONLY inserts into entities.
-- 2. Ensure NO triggers exist that leak state to `users`.

-- A. DROP POTENTIAL VAMPIRES
DROP TRIGGER IF EXISTS tr_after_entity_insert ON public.entities;
DROP FUNCTION IF EXISTS public.fn_sync_user_on_entity_creation();

-- B. REDEFINE create_business_entity (Idempotent & Pure)
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
BEGIN
    -- Explicitly preventing any side effects on the users table.
    -- Just Insert Entity.
    
    INSERT INTO public.entities (owner_id, name, type, slug, verification_status, is_public)
    VALUES (p_user_id, p_name, p_type, p_slug, 'pending', FALSE)
    RETURNING id INTO v_entity_id;

    RETURN v_entity_id;
END;
$$;
