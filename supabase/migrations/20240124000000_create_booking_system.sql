-- Reset tables to ensure schema matches (Development Mode)
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.courts CASCADE;

-- Create Courts table
CREATE TABLE public.courts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id uuid REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Create Bookings table
CREATE TABLE public.bookings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    court_id uuid REFERENCES public.courts(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    start_time timestamptz NOT NULL,
    end_time timestamptz NOT NULL,
    title text,
    type text DEFAULT 'booking', -- booking, maintenance, blocked, class
    status text DEFAULT 'confirmed', -- confirmed, cancelled, pending
    payment_status text DEFAULT 'pending', -- paid, pending, partial
    is_recurring boolean DEFAULT false,
    recurrence_parent_id uuid REFERENCES public.bookings(id),
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Courts: Public read, Owner write
CREATE POLICY "Public courts are viewable by everyone" ON public.courts
    FOR SELECT USING (true);

CREATE POLICY "Owners can insert courts" ON public.courts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.entities 
            WHERE id = club_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update courts" ON public.courts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.entities 
            WHERE id = club_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can delete courts" ON public.courts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.entities 
            WHERE id = club_id AND owner_id = auth.uid()
        )
    );

-- Bookings: Public read (availability), Owner/User write
CREATE POLICY "Bookings are viewable by everyone" ON public.bookings
    FOR SELECT USING (true);

CREATE POLICY "Owners can manage all bookings for their courts" ON public.bookings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courts c
            JOIN public.entities e ON c.club_id = e.id
            WHERE c.id = court_id AND e.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.courts c
            JOIN public.entities e ON c.club_id = e.id
            WHERE c.id = court_id AND e.owner_id = auth.uid()
        )
    );
