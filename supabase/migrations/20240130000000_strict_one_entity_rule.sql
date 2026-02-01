-- Create a unique index to enforce one entity per type per user
-- This requires the user to delete their existing entity before creating a new one of the same type
CREATE UNIQUE INDEX IF NOT EXISTS unique_owner_entity_type 
ON public.entities (owner_id, type);

-- Comment explaining the strict business rule
COMMENT ON INDEX public.unique_owner_entity_type IS 'Ensures a user can only own one Club and one Academy maximum.';
