const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function run() {
    console.log("--- INVESTIGACIÓN BOOKINGS SCHEMA ---");

    // Try to insert a dummy booking with 'c1' to see if it fails (Dry run would be nice but insert is easier to test error)
    // Actually, let's just inspect one booking if it exists.
    const { data: bookings, error } = await supabase.from('bookings').select('court_id').limit(5);

    if (bookings) {
        console.log("Muestra de Court IDs en Bookings:", bookings);
    } else {
        console.log("Error fetching bookings:", error);
    }
}
run();
