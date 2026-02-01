/*
    SEED DATA GENERATOR (CORRECTED)
    This function populates the database with realistic mock data for testing the Revenue Dashboard.
    It inserts:
    - 20 Bookings in Dec 2025 and Jan 2026.
    - Uses 'ON CONFLICT DO NOTHING' to prevent errors on re-run.
    
    INSTRUCTIONS:
    1. Copy this code.
    2. Run it in Supabase SQL Editor.
*/

DO $$
DECLARE
    v_org_id UUID;
    v_court_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Get a valid Organization and Court
    -- Strategy: Find an entity that actually has a court assigned.
    SELECT club_id, id INTO v_org_id, v_court_id 
    FROM courts 
    WHERE is_active = true 
    LIMIT 1;

    -- Backup strategy if no courts exist yet: Get any entity
    IF v_org_id IS NULL THEN
        SELECT id INTO v_org_id FROM entities LIMIT 1;
    END IF;

    -- Get a user to assign bookings to
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- Validations
    IF v_org_id IS NULL THEN
        RAISE NOTICE 'Skipping Seed: No Entity found in public.entities table.';
        RETURN;
    END IF;

    IF v_court_id IS NULL THEN
        RAISE NOTICE 'Skipping Seed: No Active Court found in public.courts table for the selected Entity.';
        RETURN;
    END IF;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Skipping Seed: No User found in auth.users.';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding Data for Entity: %, Court: %', v_org_id, v_court_id;

    -- 2. Insert Mock Bookings (Reservations)
    -- Using INSERT ... ON CONFLICT DO NOTHING (assuming id is unique, but here we let UUIDs auto-gen so conflict is unlikely unless we force IDs. 
    -- Since we want idempotency based on time/court, we check existence before insert or just insert cleanly.)
    
    -- Helper temp table or direct inserts. Direct is fine for this volume.
    
    -- December 2025
    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-05 18:00:00+00', '2025-12-05 19:30:00+00', 'Reserva Seed 1', 'paid', 40.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-05 18:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-10 19:30:00+00', '2025-12-10 21:00:00+00', 'Reserva Seed 2', 'paid', 45.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-10 19:30:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-15 17:00:00+00', '2025-12-15 18:30:00+00', 'Reserva Seed 3', 'paid', 35.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-15 17:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-20 20:00:00+00', '2025-12-20 21:30:00+00', 'Reserva Seed 4', 'paid', 50.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-20 20:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-28 10:00:00+00', '2025-12-28 11:30:00+00', 'Reserva Seed 5', 'paid', 30.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-28 10:00:00+00');

    -- January 2026
    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-05 18:00:00+00', '2026-01-05 19:30:00+00', 'Reserva Seed 6', 'paid', 40.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-05 18:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-08 19:30:00+00', '2026-01-08 21:00:00+00', 'Reserva Seed 7', 'paid', 45.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-08 19:30:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-12 17:00:00+00', '2026-01-12 18:30:00+00', 'Reserva Seed 8', 'paid', 35.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-12 17:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-15 20:00:00+00', '2026-01-15 21:30:00+00', 'Reserva Seed 9', 'paid', 50.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-15 20:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-20 09:00:00+00', '2026-01-20 10:30:00+00', 'Reserva Seed 10', 'paid', 30.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-20 09:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-22 18:00:00+00', '2026-01-22 19:30:00+00', 'Reserva Seed 11', 'paid', 40.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-22 18:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-25 11:00:00+00', '2026-01-25 12:30:00+00', 'Reserva Seed 12', 'paid', 35.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-25 11:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-28 20:00:00+00', '2026-01-28 21:30:00+00', 'Reserva Seed 13', 'paid', 50.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-28 20:00:00+00');

    RAISE NOTICE 'Seed Data Injected Successfully for Organization %', v_org_id;
END $$;
