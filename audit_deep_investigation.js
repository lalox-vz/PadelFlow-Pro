
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditData() {
    console.log('--- CRITICAL DATA AUDIT REPORT ---');

    // 1. Fetch Active Courts Mapping
    const { data: courts } = await supabase.from('courts').select('id, name, is_active');
    const courtMap = courts.reduce((acc, c) => ({ ...acc, [c.id]: { name: c.name, active: c.is_active } }), {});

    // --- SECTION 1: MASTER LIST JAN 26 ---
    console.log('SECTION 1: LISTADO MAESTRO (JAN 26)');
    const start26 = '2026-01-26T00:00:00';
    const end26 = '2026-01-26T23:59:59';

    const { data: bookings26, error: error26 } = await supabase
        .from('bookings')
        .select('id, title, court_id, start_time, total_price, payment_status')
        .gte('start_time', start26)
        .lte('start_time', end26)
        .order('start_time');

    if (error26) console.error(error26);
    else {
        bookings26.forEach(b => {
            const c = courtMap[b.court_id];
            const cName = c ? c.name : 'MISSING';
            const cActive = c ? c.active : false;
            console.log(`ID:${b.id.slice(0, 5)} Title:${b.title} Price:${b.total_price} Court:${cName} Active:${cActive} Status:${b.payment_status}`);
        });
        console.log(`Total: ${bookings26.length}`);
    }

    console.log('\nSECTION 2: DIAGNOSTICO JAN 27');
    const start27 = '2026-01-27T00:00:00';
    const end27 = '2026-01-27T23:59:59';

    const { data: bookings27, error: error27 } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', start27)
        .lte('start_time', end27);

    if (error27) console.error(error27);
    else {
        bookings27.forEach(b => {
            console.log(`Booking ID: ${b.id}`);
            console.log(`Title: ${b.title}`);
            console.log(`Recurring Plan ID: ${b.recurring_plan_id}`);
            console.log(`User ID: ${b.user_id}`);
            console.log(`Check-in: ${b.participant_checkin}`);
        });
    }
}

auditData();
