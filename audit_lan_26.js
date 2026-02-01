
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDiscrepancy() {
    console.log('--- AUDIT JAN 26, 2026 ---');

    // 1. Get Courts
    const { data: courts } = await supabase.from('courts').select('id, name, is_active');
    const validCourtIds = courts.filter(c => c.is_active).map(c => c.id);
    const allCourtIds = courts.map(c => c.id);

    console.log(`Total Courts: ${courts.length} (${validCourtIds.length} active)`);

    // 2. Get Bookings
    const start = '2026-01-26T00:00:00';
    const end = '2026-01-26T23:59:59';

    // Explicitly fetching payment_status
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, title, court_id, start_time, total_price, payment_status')
        .gte('start_time', start)
        .lte('start_time', end);

    if (error) { console.error(error); return; }

    console.log(`Total Bookings Fetched: ${bookings.length}`);

    let invalidCount = 0;
    bookings.forEach(b => {
        const isActive = validCourtIds.includes(b.court_id);
        const exists = allCourtIds.includes(b.court_id);

        let status = 'OK';
        if (!exists) { status = 'ORPHAN (Court missing)'; invalidCount++; }
        else if (!isActive) { status = 'INACTIVE COURT'; }

        console.log(`[${status}] Booking ${b.id.slice(0, 5)} | Court: ${b.court_id} | Price: ${b.total_price} | Status: ${b.payment_status}`);
    });
}

checkDiscrepancy();
