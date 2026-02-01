const { createClient } = require('@supabase/supabase-js');

// Valores tomados de .env
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
// Service Role Key real del archivo .env que permite bypass RLS
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function run() {
    console.log("--- DEBUGGER SUPABASE (ADMIN ACCESS) ---");

    try {
        // 1. Verificar Usuario y su Org
        const userId = '70e8610d-2c9b-403f-bfd2-21a279251b1b';
        console.log(`\n1. Buscando usuario: ${userId}`);

        // Necesitamos saber la columna de Org en users tambien
        const { data: users, error: uError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId);

        if (uError) {
            console.error("❌ Error usuario:", uError);
        } else if (!users || users.length === 0) {
            console.error("❌ Usuario no encontrado.");
        } else {
            const user = users[0];
            console.log("✅ Usuario encontrado:", user);
            console.log("   --> organization_id:", user.organization_id);
            console.log("   --> role:", user.role);

            const targetOrgId = user.organization_id;

            // 2. Buscar Canchas (usando club_id Y organization_id para ver cual funciona)
            if (targetOrgId) {
                console.log(`\n2. Buscando canchas para Org: ${targetOrgId}`);

                // Prueba A: organization_id
                const { data: cOrg, error: eOrg } = await supabase
                    .from('courts')
                    .select('*')
                    .eq('organization_id', targetOrgId);

                if (cOrg && cOrg.length > 0) {
                    console.log(`✅ Query por 'organization_id' trajo ${cOrg.length} canchas.`);
                    console.log("   Ejemplo:", cOrg[0]);
                } else {
                    console.log(`⚠️ Query por 'organization_id' vacía o falló. (${eOrg?.message || 'Sin datos'})`);
                }

                // Prueba B: club_id
                const { data: cClub, error: eClub } = await supabase
                    .from('courts')
                    .select('*')
                    .eq('club_id', targetOrgId);

                if (cClub && cClub.length > 0) {
                    console.log(`✅ Query por 'club_id' trajo ${cClub.length} canchas.`);
                    console.log("   Ejemplo:", cClub[0]);
                } else {
                    console.log(`⚠️ Query por 'club_id' vacía o falló. (${eClub?.message || 'Sin datos'})`);
                }
            }
        }

        // 3. Inspeccionar estructura cruda de Courts (sin filtros)
        console.log("\n3. Inspección General 'courts' (Limit 1)");
        const { data: allCourts, error: allError } = await supabase.from('courts').select('*').limit(1);
        if (allCourts && allCourts.length > 0) {
            console.log("Keys detectadas en tabla courts:", Object.keys(allCourts[0]));
        } else {
            console.log("No hay canchas en absoluto o error:", allError);
        }

    } catch (e) {
        console.error("Excepción:", e);
    }
}

run();
