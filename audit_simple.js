
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function auditData() {
    console.log('\n--- CLEAN AUDIT JAN 26 ---');
    const start26 = '2026-01-26T00:00:00';
    const end26 = '2026-01-26T23:59:59';

    // Select everything, no filters on active courts yet
    const { data: bookings26, error } = await supabase
        .from('bookings')
        .select('id, title, total_price, court_id, payment_status')
        .gte('start_time', start26)
        .lte('start_time', end26);

    if (error) console.error(error);
    else {
        bookings26.forEach(b => {
            console.log(`[${b.id.slice(0, 5)}] ${b.title} $${b.total_price} Court:${b.court_id} Status:${b.payment_status}`);
        });
        console.log(`Total Count: ${bookings26.length}`);
        const sum = bookings26.reduce((acc, b) => acc + (b.total_price || 0), 0);
        console.log(`Total Sum: $${sum}`);
    }
}

auditData();
