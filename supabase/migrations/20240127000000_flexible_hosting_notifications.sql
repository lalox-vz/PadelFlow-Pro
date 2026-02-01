-- =============================================
-- PADELFLOW: FLEXIBLE HOSTING & NOTIFICATIONS
-- Phase 1 - Foundation Tables Only
-- =============================================
-- This migration creates NEW tables without touching existing Olimpo tables
-- DROPS existing tables first for clean slate

-- ========================================
-- STEP 0: Clean Slate (Drop if exists)
-- ========================================
-- Drop functions first (they don't depend on tables)
DROP FUNCTION IF EXISTS handle_hosting_approval() CASCADE;
DROP FUNCTION IF EXISTS approve_hosting_request() CASCADE;
DROP FUNCTION IF EXISTS get_unread_notification_count(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_notification_read(UUID) CASCADE;
DROP FUNCTION IF EXISTS mark_all_notifications_read() CASCADE;

-- Drop tables (CASCADE will drop any triggers automatically)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.hosting_requests CASCADE;
DROP TABLE IF EXISTS public.coach_invitations CASCADE;
DROP TABLE IF EXISTS public.student_requests CASCADE;

-- ========================================
-- STEP 1: Notifications Table
-- ========================================
-- Central notification system for all user roles
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification metadata
    type TEXT NOT NULL CHECK (type IN (
        'hosting_request', 'hosting_approved', 'hosting_declined',
        'coach_invitation', 'coach_accepted', 'coach_declined',
        'student_request', 'student_accepted', 'student_declined',
        'payment_pending', 'payment_approved', 'payment_declined',
        'class_assignment', 'class_cancellation',
        'booking_confirmation', 'booking_cancellation',
        'occupancy_milestone', 'new_local_player',
        'student_milestone', 'free_court_alert',
        'level_up', 'academy_invitation', 'general'
    )),
    
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    
    -- Action configuration
    action_type TEXT CHECK (action_type IN ('accept_decline', 'view', 'approve_deny', 'none')),
    action_url TEXT,
    related_id UUID,
    related_type TEXT,
    
    -- Status tracking
    read BOOLEAN NOT NULL DEFAULT FALSE,
    actioned BOOLEAN NOT NULL DEFAULT FALSE,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    
    -- Timestamps (EXPLICIT)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ========================================
-- STEP 2: Hosting Requests Table
-- ========================================
-- Academies can request to be hosted by a Club
CREATE TABLE public.hosting_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    
    -- Request details
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
    message TEXT,
    
    -- Response tracking
    responded_at TIMESTAMPTZ,
    responded_by UUID REFERENCES auth.users(id),
    
    -- Timestamps (EXPLICIT)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate active requests
    CONSTRAINT unique_active_hosting_request UNIQUE (academy_id, club_id, status)
);

-- ========================================
-- STEP 3: Coach Invitations Table
-- ========================================
-- Academies can invite coaches to join
CREATE TABLE public.coach_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    
    -- Coach identification (email-based, may link to user later)
    coach_email TEXT NOT NULL,
    coach_user_id UUID REFERENCES auth.users(id),
    
    -- Invitation details
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    message TEXT,
    specialty TEXT,
    
    -- Response tracking
    responded_at TIMESTAMPTZ,
    
    -- Timestamps (EXPLICIT)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- STEP 4: Student Requests Table
-- ========================================
-- Academies can invite/add students (players)
CREATE TABLE public.student_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academy_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    
    -- Student identification (email-based, may link to user later)
    student_email TEXT NOT NULL,
    student_user_id UUID REFERENCES auth.users(id),
    
    -- Request details
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    message TEXT,
    program_name TEXT,
    
    -- Response tracking
    responded_at TIMESTAMPTZ,
    
    -- Timestamps (EXPLICIT)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================
-- STEP 5: Performance Indexes
-- ========================================

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON public.notifications(user_id) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
    ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type 
    ON public.notifications(type, created_at DESC);

-- Hosting Requests
CREATE INDEX IF NOT EXISTS idx_hosting_requests_club 
    ON public.hosting_requests(club_id, status);
CREATE INDEX IF NOT EXISTS idx_hosting_requests_academy 
    ON public.hosting_requests(academy_id, status);
CREATE INDEX IF NOT EXISTS idx_hosting_requests_status 
    ON public.hosting_requests(status, created_at DESC);

-- Coach Invitations
CREATE INDEX IF NOT EXISTS idx_coach_invitations_email 
    ON public.coach_invitations(coach_email, status);
CREATE INDEX IF NOT EXISTS idx_coach_invitations_academy 
    ON public.coach_invitations(academy_id, status);

-- Student Requests
CREATE INDEX IF NOT EXISTS idx_student_requests_email 
    ON public.student_requests(student_email, status);
CREATE INDEX IF NOT EXISTS idx_student_requests_academy 
    ON public.student_requests(academy_id, status);

-- ========================================
-- STEP 6: Auto-Link Trigger
-- ========================================
-- When hosting request is approved → automatically update academy's host_club_id

CREATE OR REPLACE FUNCTION handle_hosting_approval()
RETURNS TRIGGER AS $$
DECLARE
    academy_owner_id UUID;
    club_owner_id UUID;
BEGIN
    -- Only trigger on approval
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        
        -- Update academy's host_club_id in entities table
        UPDATE public.entities
        SET host_club_id = NEW.club_id,
            updated_at = NOW()
        WHERE id = NEW.academy_id;
        
        -- Set response timestamp
        NEW.responded_at = NOW();
        
        -- Get owner IDs for notifications
        SELECT owner_id INTO academy_owner_id 
        FROM public.entities 
        WHERE id = NEW.academy_id;
        
        SELECT owner_id INTO club_owner_id 
        FROM public.entities 
        WHERE id = NEW.club_id;
        
        -- Notify academy owner
        IF academy_owner_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority, 
                action_type, related_id, related_type, created_at
            ) VALUES (
                academy_owner_id,
                'hosting_approved',
                '🎉 ¡Solicitud Aprobada!',
                'Tu academia ha sido vinculada exitosamente al club.',
                'high',
                'view',
                NEW.id,
                'hosting_request',
                NOW()
            );
        END IF;
        
        -- Notify club owner
        IF club_owner_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id, type, title, message, priority,
                action_type, related_id, related_type, created_at
            ) VALUES (
                club_owner_id,
                'hosting_request',
                '✅ Academia Vinculada',
                'Una nueva academia se ha unido a tu club.',
                'normal',
                'view',
                NEW.id,
                'hosting_request',
                NOW()
            );
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trigger_hosting_approval ON public.hosting_requests;
CREATE TRIGGER trigger_hosting_approval
    BEFORE UPDATE ON public.hosting_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_hosting_approval();

-- ========================================
-- STEP 7: Row Level Security (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hosting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_requests ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true); -- Allow system/triggers to create notifications

-- Hosting Requests Policies
DROP POLICY IF EXISTS "View hosting requests" ON public.hosting_requests;
CREATE POLICY "View hosting requests"
    ON public.hosting_requests FOR SELECT
    USING (
        academy_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid())
        OR club_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Academies can create hosting requests" ON public.hosting_requests;
CREATE POLICY "Academies can create hosting requests"
    ON public.hosting_requests FOR INSERT
    WITH CHECK (
        academy_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid() AND type = 'ACADEMY')
    );

DROP POLICY IF EXISTS "Update hosting requests" ON public.hosting_requests;
CREATE POLICY "Update hosting requests"
    ON public.hosting_requests FOR UPDATE
    USING (
        academy_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid())
        OR club_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid())
    );

-- Coach Invitations Policies
DROP POLICY IF EXISTS "View coach invitations" ON public.coach_invitations;
CREATE POLICY "View coach invitations"
    ON public.coach_invitations FOR SELECT
    USING (
        academy_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid())
        OR coach_user_id = auth.uid()
        OR coach_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Academies create coach invitations" ON public.coach_invitations;
CREATE POLICY "Academies create coach invitations"
    ON public.coach_invitations FOR INSERT
    WITH CHECK (
        academy_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Coaches can respond to invitations" ON public.coach_invitations;
CREATE POLICY "Coaches can respond to invitations"
    ON public.coach_invitations FOR UPDATE
    USING (
        coach_user_id = auth.uid() 
        OR coach_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Student Requests Policies
DROP POLICY IF EXISTS "View student requests" ON public.student_requests;
CREATE POLICY "View student requests"
    ON public.student_requests FOR SELECT
    USING (
        academy_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid())
        OR student_user_id = auth.uid()
        OR student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

DROP POLICY IF EXISTS "Academies manage student requests" ON public.student_requests;
CREATE POLICY "Academies manage student requests"
    ON public.student_requests FOR ALL
    USING (
        academy_id IN (SELECT id FROM public.entities WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Students can respond" ON public.student_requests;
CREATE POLICY "Students can respond"
    ON public.student_requests FOR UPDATE
    USING (
        student_user_id = auth.uid()
        OR student_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- ========================================
-- STEP 8: Helper Functions
-- ========================================

-- Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM public.notifications 
        WHERE user_id = p_user_id AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET read = TRUE, actioned = TRUE
    WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET read = TRUE
    WHERE user_id = auth.uid() AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '========================';
    RAISE NOTICE '✅ PadelFlow Migration Complete!';
    RAISE NOTICE '========================';
    RAISE NOTICE '📋 Tables Created:';
    RAISE NOTICE '   → notifications';
    RAISE NOTICE '   → hosting_requests';
    RAISE NOTICE '   → coach_invitations';
    RAISE NOTICE '   → student_requests';
    RAISE NOTICE '';
    RAISE NOTICE '🔔 Features Ready:';
    RAISE NOTICE '   → Global notification system';
    RAISE NOTICE '   → Academy-Club hosting flow';
    RAISE NOTICE '   → Coach invitation system';
    RAISE NOTICE '   → Student enrollment requests';
    RAISE NOTICE '';
    RAISE NOTICE '🔐 Security:';
    RAISE NOTICE '   → RLS enabled on all tables';
    RAISE NOTICE '   → User-scoped data access';
    RAISE NOTICE '';
    RAISE NOTICE '⚡ Auto-linking enabled';
    RAISE NOTICE '========================';
END $$;
