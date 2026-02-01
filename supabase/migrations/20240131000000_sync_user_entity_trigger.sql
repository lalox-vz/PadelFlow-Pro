-- Function to sync user role and organization after entity creation automatically
-- This ensures that as soon as an entity is created, the owner's profile is updated.

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
        -- If user creates some other entity type in the future, we might strictly check permissions
        -- For now, just return without updating if unknown
        RETURN NEW;
    END IF;

    -- Update the user profile
    -- SECURITY DEFINER allows this function to update users even if the user inserting
    -- might not have direct update permissions on specific user columns (though they usually do on their own row)
    UPDATE public.users
    SET 
        organization_id = NEW.id,
        has_business = true,
        role = new_role,
        business_type = new_business_type
    WHERE id = NEW.owner_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_after_entity_insert ON public.entities;

CREATE TRIGGER tr_after_entity_insert
AFTER INSERT ON public.entities
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_user_on_entity_creation();
