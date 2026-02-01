-- Academy Students Table
CREATE TABLE IF NOT EXISTS public.academy_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    enrollment_date TIMESTAMPTZ DEFAULT now(),
    program_id UUID, -- Reference to program (will link later)
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_hold')),
    attendance_rate NUMERIC(5,2) DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Academy Coaches Table
CREATE TABLE IF NOT EXISTS public.academy_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty TEXT,
    experience_years INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 0,
    availability TEXT DEFAULT 'full_time' CHECK (availability IN ('full_time', 'part_time', 'substitute')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Academy Schedule/Classes Table
CREATE TABLE IF NOT EXISTS public.academy_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.academy_coaches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Monday
    start_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    max_students INTEGER DEFAULT 15,
    current_students INTEGER DEFAULT 0,
    color TEXT DEFAULT 'blue',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
    recurring BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Student-Class Enrollment (many-to-many)
CREATE TABLE IF NOT EXISTS public.class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.academy_students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.academy_classes(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
    UNIQUE(student_id, class_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_academy_students_academy ON public.academy_students(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_students_status ON public.academy_students(status);
CREATE INDEX IF NOT EXISTS idx_academy_coaches_academy ON public.academy_coaches(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_classes_academy ON public.academy_classes(academy_id);
CREATE INDEX IF NOT EXISTS idx_academy_classes_coach ON public.academy_classes(coach_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class ON public.class_enrollments(class_id);

-- Enable RLS
ALTER TABLE public.academy_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Academy Owners can manage their own academy data

-- Students
CREATE POLICY "Academy owners can view their students"
    ON public.academy_students FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can insert students"
    ON public.academy_students FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can update their students"
    ON public.academy_students FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can delete their students"
    ON public.academy_students FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

-- Coaches (same pattern)
CREATE POLICY "Academy owners can view their coaches"
    ON public.academy_coaches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can insert coaches"
    ON public.academy_coaches FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can update their coaches"
    ON public.academy_coaches FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can delete their coaches"
    ON public.academy_coaches FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

-- Classes (same pattern)
CREATE POLICY "Academy owners can view their classes"
    ON public.academy_classes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can insert classes"
    ON public.academy_classes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can update their classes"
    ON public.academy_classes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Academy owners can delete their classes"
    ON public.academy_classes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.entities
            WHERE id = academy_id AND owner_id = auth.uid()
        )
    );

-- Enrollments
CREATE POLICY "Academy owners can manage enrollments"
    ON public.class_enrollments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.academy_students s
            JOIN public.entities e ON s.academy_id = e.id
            WHERE s.id = student_id AND e.owner_id = auth.uid()
        )
    );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_academy_students_updated_at BEFORE UPDATE ON public.academy_students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_coaches_updated_at BEFORE UPDATE ON public.academy_coaches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_academy_classes_updated_at BEFORE UPDATE ON public.academy_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update current_students count when enrollments change
CREATE OR REPLACE FUNCTION update_class_student_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.academy_classes
        SET current_students = (
            SELECT COUNT(*) FROM public.class_enrollments
            WHERE class_id = NEW.class_id AND status = 'active'
        )
        WHERE id = NEW.class_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.academy_classes
        SET current_students = (
            SELECT COUNT(*) FROM public.class_enrollments
            WHERE class_id = OLD.class_id AND status = 'active'
        )
        WHERE id = OLD.class_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE public.academy_classes
        SET current_students = (
            SELECT COUNT(*) FROM public.class_enrollments
            WHERE class_id = NEW.class_id AND status = 'active'
        )
        WHERE id = NEW.class_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_count_on_enrollment
AFTER INSERT OR UPDATE OR DELETE ON public.class_enrollments
FOR EACH ROW EXECUTE FUNCTION update_class_student_count();
