-- Add unique constraints to club_members to support UPSERT operations
-- We use partial indexes or constraints to handle NULLs gracefully if needed, 
-- but for standard UPSERT on (entity_id, phone/email) we need unique constraints/indexes.

-- Safely remove duplicates if any exist (optional but recommended before adding constraints)
-- For now, we assume data is clean or we might want to just add the constraints and let it fail if dirty.
-- Given "World Class", we should probably ensure unique constraints exist.

-- Unique constraint for Phone within an Entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_members_entity_phone 
ON public.club_members (entity_id, phone) 
WHERE phone IS NOT NULL;

-- Unique constraint for Email within an Entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_members_entity_email 
ON public.club_members (entity_id, email) 
WHERE email IS NOT NULL;

-- Unique constraint for User ID within an Entity (should likely already exist or be enforced)
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_members_entity_user_id 
ON public.club_members (entity_id, user_id) 
WHERE user_id IS NOT NULL;
