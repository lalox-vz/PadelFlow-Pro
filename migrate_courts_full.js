const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function run() {
    console.log("--- MIGRATION: JSON TO SQL (COURTS) ---");
    const orgId = '70e8610d-2c9b-403f-bfd2-21a279251b1b';

    // 1. Get JSON Config
    const { data: ent } = await supabase.from('entities').select('details').eq('id', orgId).single();
    const jsonCourts = ent?.details?.courts || [];
    console.log(`1. Found ${jsonCourts.length} courts in JSON.`);

    // 2. Get SQL Courts
    const { data: sqlCourts } = await supabase.from('courts').select('*').eq('club_id', orgId);
    console.log(`2. Found ${sqlCourts?.length || 0} courts in SQL.`);

    // 3. Map & Migrate
    for (const jc of jsonCourts) {
        // Find matching SQL court by Name (fuzzy match or exact)
        // Note: My previous insert used exact names 'Cancha Solera', etc? No, I used 'Cancha Solera' but JSON says 'Solera'.
        // Let's check names.
        // SQL Inserted: 'Cancha Solera', 'Cancha Pawer'...
        // JSON: 'Solera', 'Pawer'...
        // Need smart matching.

        const match = sqlCourts.find(sc => sc.name.includes(jc.name) || jc.name.includes(sc.name));

        if (match) {
            console.log(`   MATCH: JSON [${jc.name}] (${jc.id}) -> SQL [${match.name}] (${match.id})`);

            if (jc.id !== match.id) {
                console.log(`      -> Migrating Bookings from '${jc.id}' to '${match.id}'...`);
                const { error: bErr } = await supabase
                    .from('bookings')
                    .update({ court_id: match.id })
                    .eq('court_id', jc.id);

                if (bErr) console.error("         ERROR Updating bookings:", bErr.message);
                else console.log("         OK.");
            }
        } else {
            console.log(`   NO MATCH for JSON [${jc.name}]. Creating in SQL...`);
            const { data: newC, error: iErr } = await supabase
                .from('courts')
                .insert({
                    club_id: orgId,
                    name: jc.name, // Use JSON name? Or 'Cancha ' + name? Let's use JSON name for consistency.
                    is_active: jc.isActive
                })
                .select()
                .single();

            if (newC) {
                console.log(`      -> Created SQL Court: ${newC.name} (${newC.id})`);
                console.log(`      -> Migrating Bookings from '${jc.id}' to '${newC.id}'...`);
                const { error: bErr } = await supabase
                    .from('bookings')
                    .update({ court_id: newC.id })
                    .eq('court_id', jc.id);
                if (bErr) console.error("         ERROR Updating bookings:", bErr.message);
            } else {
                console.error("      ERROR Creating court:", iErr);
            }
        }
    }

    console.log("Migration Complete.");
}

run();
