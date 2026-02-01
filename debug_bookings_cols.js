const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function run() {
    const { data: cols, error } = await supabase.from('bookings').select('*').limit(1);
    if (cols && cols.length > 0) {
        console.log("Bookings columns:", Object.keys(cols[0]));
    } else {
        console.log("Error or empty:", error);
    }
}
run();
