const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function run() {
    const orgId = '70e8610d-2c9b-403f-bfd2-21a279251b1b';
    console.log(`--- INVESTIGACIÓN JSON CONFIG (Org: ${orgId}) ---`);
    const { data: entities, error } = await supabase.from('entities').select('details').eq('id', orgId).single();

    if (entities) {
        console.log("Estructura JSON (details) encontrada:");
        // Show keys mostly
        const d = entities.details || {};
        console.log("Keys:", Object.keys(d));
        if (d.courts) {
            console.log("Courts in JSON:", d.courts);
        } else {
            console.log("⚠ No 'courts' key in JSON.");
        }
    } else {
        console.log("Error o sin datos:", error);
    }
}
run();
