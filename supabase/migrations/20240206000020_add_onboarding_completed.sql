-- Add onboarding_completed column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Update existing users to have it TRUE if they already have a business or are clearly active?
-- For safety, we can leave it FALSE for legacy 'player' users so they see the welcome screen once, 
-- OR we can set it to TRUE for anyone who already has a role other than 'student'/'player' or has 'has_business' = true.

UPDATE public.users 
SET onboarding_completed = TRUE 
WHERE has_business = TRUE 
   OR role IN ('owner', 'club_owner', 'academy_owner', 'coach', 'admin', 'super_admin');

-- Optional: If you want all EXISTING players to skip this, uncomment:
-- UPDATE public.users SET onboarding_completed = TRUE WHERE role = 'student' OR role = 'player';
