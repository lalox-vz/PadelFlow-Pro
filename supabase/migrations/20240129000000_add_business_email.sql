-- Add business_email column to entities table for public/admin contact
ALTER TABLE public.entities 
ADD COLUMN IF NOT EXISTS business_email TEXT;

-- Update RLS policies if needed?
-- Existing policies allow owner to update their own entity, so adding a column doesn't break RLS usually if "for update" covers valid rows.
-- But we might need to verify if we need to specifically grant access to this column? No, Postgres RLS is row-based usually.

-- Comment on column
COMMENT ON COLUMN public.entities.business_email IS 'Public contact email for the business, distinct from the owner''s login email.';
