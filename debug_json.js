const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function run() {
    console.log("--- INVESTIGACIÓN JSON CONFIG ---");
    const { data: entities, error } = await supabase.from('entities').select('details').limit(1);

    if (entities && entities.length > 0) {
        console.log("Estructura JSON (details) encontrada:");
        console.log(JSON.stringify(entities[0].details, null, 2));
    } else {
        console.log("Error o sin datos:", error);
    }
}
run();
