-- ================================================
-- STAFF OPTIMIZATION PACK (Fixed for Idempotency)
-- Includes: Shift Reports & Booking Check-in
-- ================================================

-- 1. Add Check-in status to bookings
-- Using IF NOT EXISTS helps avoid errors if the column was already added partially
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS participant_checkin BOOLEAN DEFAULT FALSE;

-- 2. Create Shift Reports table
CREATE TABLE IF NOT EXISTS public.shift_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
    cash_amount NUMERIC(10,2) DEFAULT 0,
    transfer_amount NUMERIC(10,2) DEFAULT 0,
    card_amount NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    shift_date DATE DEFAULT CURRENT_DATE
);

-- Indexes (IF NOT EXISTS protects against re-runs)
CREATE INDEX IF NOT EXISTS idx_shift_reports_org ON public.shift_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_date ON public.shift_reports(created_at);

-- Enable RLS
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;

-- Policies (Using DROP POLICY IF EXISTS to make it fully idempotent)

DROP POLICY IF EXISTS "owners_view_reports" ON public.shift_reports;
CREATE POLICY "owners_view_reports" ON public.shift_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.organization_id = shift_reports.organization_id
            AND users.role IN ('club_owner', 'academy_owner')
        )
    );

DROP POLICY IF EXISTS "staff_view_reports" ON public.shift_reports;
CREATE POLICY "staff_view_reports" ON public.shift_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.organization_id = shift_reports.organization_id
            AND users.role = 'club_staff'
        )
    );

DROP POLICY IF EXISTS "users_create_reports" ON public.shift_reports;
CREATE POLICY "users_create_reports" ON public.shift_reports
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.organization_id = shift_reports.organization_id
            AND users.role IN ('club_owner', 'academy_owner', 'club_staff')
        )
    );

-- 3. Update Audit Logger to track Check-in
-- CREATE OR REPLACE is already idempotent
CREATE OR REPLACE FUNCTION log_booking_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.booking_logs (booking_id, user_id, action, notes)
        VALUES (
            NEW.id,
            auth.uid(),
            'created',
            'Reserva creada para ' || COALESCE(NEW.title, 'Sin nombre')
        );
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Detect what changed
        DECLARE
            changes TEXT := '';
        BEGIN
            IF OLD.title != NEW.title THEN
                changes := changes || 'Nombre: ' || OLD.title || ' → ' || NEW.title || '. ';
            END IF;
            IF OLD.payment_status != NEW.payment_status THEN
                changes := changes || 'Pago: ' || OLD.payment_status || ' → ' || NEW.payment_status || '. ';
            END IF;
            IF OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time THEN
                changes := changes || 'Horario modificado. ';
            END IF;
            IF OLD.court_id != NEW.court_id THEN
                changes := changes || 'Cancha cambiada. ';
            END IF;
            -- Check-in tracking
            IF OLD.participant_checkin IS DISTINCT FROM NEW.participant_checkin THEN
                IF NEW.participant_checkin THEN
                    changes := changes || '✅ Cliente hizo Check-in. ';
                ELSE
                    changes := changes || 'Check-in revertido. ';
                END IF;
            END IF;
            
            INSERT INTO public.booking_logs (booking_id, user_id, action, notes)
            VALUES (
                NEW.id,
                auth.uid(),
                'updated',
                changes
            );
        END;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.booking_logs (booking_id, user_id, action, notes)
        VALUES (
            OLD.id,
            auth.uid(),
            'cancelled',
            'Reserva cancelada'
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
