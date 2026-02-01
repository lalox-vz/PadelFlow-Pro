-- POLICY: Allow public read access to trainings
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Enable RLS (just in case)
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy for Public Select
CREATE POLICY "Public Read Trainings"
ON trainings
FOR SELECT
TO public
USING (true);

-- 3. Also allow public to read coaches if applicable
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Coaches"
ON coaches
FOR SELECT
TO public
USING (true);
