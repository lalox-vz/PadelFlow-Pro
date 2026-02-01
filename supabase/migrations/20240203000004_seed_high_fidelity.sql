/*
    SEED DATA GENERATOR - HIGH FIDELITY
    Populates 'bookings' with price data for revenue testing.
    
    Logic:
    1. Finds active court and entity.
    2. Inserts 20 varied bookings in Dec 2025/Jan 2026.
    3. Uses 'price' column.
    4. Idempotent (checks existence before insert).
*/

DO $$
DECLARE
    v_org_id UUID;
    v_court_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Discovery
    SELECT club_id, id INTO v_org_id, v_court_id FROM courts WHERE is_active = true LIMIT 1;
    
    IF v_org_id IS NULL THEN
        -- Fallback if no specific active court found, try generic entity
        SELECT id INTO v_org_id FROM entities LIMIT 1;
    END IF;

    SELECT id INTO v_user_id FROM auth.users LIMIT 1;

    -- Safety Check
    IF v_org_id IS NULL OR v_user_id IS NULL THEN
        RAISE NOTICE 'Skipping: Missing Organization or User.';
        RETURN;
    END IF;

    -- If no court found but entity exists, creating dummy court variable is needed or skip.
    -- For seed to work, we need a court_id since it's likely a foreign key.
    IF v_court_id IS NULL THEN
         RAISE NOTICE 'Skipping: No Court Found.';
         RETURN;
    END IF;

    RAISE NOTICE 'Seeding Revenue Data for Org: %', v_org_id;

    -- 2. Insert Bookings (Dec 2025)
    -- High Value
    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-05 18:00:00+00', '2025-12-05 19:30:00+00', 'Torneo QF', 'paid', 60.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-05 18:00:00+00');

    -- Standard
    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-06 10:00:00+00', '2025-12-06 11:30:00+00', 'Clase', 'paid', 40.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-06 10:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-10 19:30:00+00', '2025-12-10 21:00:00+00', 'Partido', 'paid', 45.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-10 19:30:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-15 17:00:00+00', '2025-12-15 18:30:00+00', 'Partido', 'paid', 35.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-15 17:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-20 20:00:00+00', '2025-12-20 21:30:00+00', 'Partido Prime', 'paid', 55.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-20 20:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-22 09:00:00+00', '2025-12-22 10:30:00+00', 'Mañanero', 'paid', 30.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-22 09:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2025-12-28 11:00:00+00', '2025-12-28 12:30:00+00', 'Fin de Año', 'paid', 40.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2025-12-28 11:00:00+00');


    -- 3. Insert Bookings (Jan 2026) - Growth Scenario
    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-05 18:00:00+00', '2026-01-05 19:30:00+00', 'Enero 1', 'paid', 45.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-05 18:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-08 19:30:00+00', '2026-01-08 21:00:00+00', 'Enero 2', 'paid', 50.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-08 19:30:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-12 17:00:00+00', '2026-01-12 18:30:00+00', 'Enero 3', 'paid', 40.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-12 17:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-15 20:00:00+00', '2026-01-15 21:30:00+00', 'Enero 4', 'paid', 55.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-15 20:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-18 09:00:00+00', '2026-01-18 10:30:00+00', 'Enero 5', 'paid', 35.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-18 09:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-20 18:00:00+00', '2026-01-20 19:30:00+00', 'Enero 6', 'paid', 45.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-20 18:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-22 19:30:00+00', '2026-01-22 21:00:00+00', 'Enero 7', 'paid', 50.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-22 19:30:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-25 11:00:00+00', '2026-01-25 12:30:00+00', 'Enero 8', 'paid', 40.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-25 11:00:00+00');

    INSERT INTO bookings (entity_id, court_id, user_id, start_time, end_time, title, payment_status, price)
    SELECT v_org_id, v_court_id, v_user_id, '2026-01-28 20:00:00+00', '2026-01-28 21:30:00+00', 'Enero 9', 'paid', 60.00
    WHERE NOT EXISTS (SELECT 1 FROM bookings WHERE entity_id = v_org_id AND start_time = '2026-01-28 20:00:00+00');

END $$;
