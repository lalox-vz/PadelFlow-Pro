-- Create Coaches table
CREATE TABLE IF NOT EXISTS public.coaches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    specialty text, -- e.g. Yoga, Functional
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS for Coaches
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Admins can manage coaches, everyone can read
CREATE POLICY "Public read access for coaches" ON public.coaches
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage coaches" ON public.coaches
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'admin')
    );

-- Update Trainings table to reference Coach
ALTER TABLE public.trainings
ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL;
