-- FIX: Cast 'new_role' text variable to 'user_role' enum to prevent type mismatch error
-- The error "column role is of type user_role but expression is of type text" occurs because
-- PL/pgSQL variables declared as TEXT do not auto-cast to ENUMs in UPDATE statements as easily as literals.

CREATE OR REPLACE FUNCTION public.fn_sync_user_on_entity_creation()
RETURNS TRIGGER AS $$
DECLARE
    new_role text;
    new_business_type text;
BEGIN
    -- Determine role and business type based on entity type
    -- Using LOWER() to handle any case inconsistencies
    IF LOWER(NEW.type::text) = 'club' THEN
        new_role := 'club_owner';
        new_business_type := 'club';
    ELSIF LOWER(NEW.type::text) = 'academy' THEN
        new_role := 'academy_owner';
        new_business_type := 'academy';
    ELSE
        -- If unknown type, do not update user
        RETURN NEW;
    END IF;

    -- Update the user profile
    -- Explicitly cast new_role to user_role type
    UPDATE public.users
    SET 
        organization_id = NEW.id,
        has_business = true,
        role = new_role::public.user_role, -- CAST HERE
        business_type = new_business_type
    WHERE id = NEW.owner_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
