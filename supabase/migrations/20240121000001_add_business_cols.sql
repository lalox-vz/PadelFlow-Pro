-- Add business columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS has_business BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS business_type TEXT CHECK (business_type IN ('club', 'academy'));

-- Update policies to allow users to update these columns (if they can update their own profile)
-- "Users can update own profile" policy already exists for ALL columns, so this should be fine.
