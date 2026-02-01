const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function run() {
    console.log("--- AUDITORÍA INTEGRIDAD JSON ---");
    const orgId = '70e8610d-2c9b-403f-bfd2-21a279251b1b'; // Gallery Padel Club

    // 1. Entities JSON
    const { data: ent } = await supabase.from('entities').select('details').eq('id', orgId).single();
    if (ent?.details) {
        console.log("Keys in entities.details:", Object.keys(ent.details));
        if (ent.details.schedules) console.log(" - Found 'schedules' configuration.");
        if (ent.details.bookingRules) console.log(" - Found 'bookingRules' configuration.");
        if (ent.details.dynamicRules) console.log(" - Found 'dynamicRules' configuration.");
        if (ent.details.courts) console.log(" - WARNING: 'courts' key still exists in JSON (Zombie Data).");
        if (ent.details.payment_methods) console.log(" - Found 'payment_methods' configuration.");
    }

    // 2. Check for other JSON columns
    console.log("\n--- ESCANEO DE TABLAS ---");
    const { data: cols } = await supabase.rpc('get_json_columns');
    // Since I can't easily call internal pg metadata via easy RPC if not defined, I'll use the PG client if available, 
    // but I don't have the pg client set up with the password right now in this specific context (I used it in step 2802 but cleaner to use JS client if possible, or just re-use the pg script method).
    // Actually, I can use the 'debug_db.js' approach from earlier which used the direct PG connection. I'll rewrite that script.
}

run();
