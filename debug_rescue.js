const { createClient } = require('@supabase/supabase-js');

// Valores .env
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    console.log("--- RESCUE MISSION: DATOS EXISTENTES ---");

    try {
        // 1. Listar Entidades (Clubes)
        console.log("\n1. Entidades (Clubs/Academies):");
        const { data: entities, error: eErr } = await supabase
            .from('entities')
            .select('id, name, owner_id');

        if (entities && entities.length > 0) {
            entities.forEach(e => console.log(`   🔸 [${e.name}] ID: ${e.id} (Dueño: ${e.owner_id})`));
        } else {
            console.log("   ❌ No hay entidades encontradas.");
            if (eErr) console.error("      Error:", eErr.message);
        }

        // 2. Listar Usuarios (para encontrar a Carlos/Lalo)
        console.log("\n2. Usuarios (Primeros 20):");
        const { data: users, error: uErr } = await supabase
            .from('users')
            .select('id, email, full_name, role, organization_id')
            .limit(20);

        if (users && users.length > 0) {
            users.forEach(u => console.log(`   👤 [${u.email}] ${u.full_name} | Role: ${u.role} | Org: ${u.organization_id} | ID: ${u.id}`));
        } else {
            console.log("   ❌ No hay usuarios encontrados.");
            if (uErr) console.error("      Error:", uErr.message);
        }

        // 3. Buscar Huérfanos en Courts
        console.log("\n3. Canchas Existentes (Tabla 'courts'):");
        const { data: courts, error: cErr } = await supabase
            .from('courts')
            .select('id, name, club_id, is_active'); // Asumiendo schema verificado antes

        if (courts && courts.length > 0) {
            courts.forEach(c => console.log(`   court: [${c.name}] ClubID: ${c.club_id} Active: ${c.is_active}`));
        } else {
            console.log("   ❌ La tabla 'courts' está VACÍA.");
            if (cErr) console.error("      Error:", cErr.message);
        }

    } catch (e) {
        console.error("Excepción CRÍTICA:", e);
    }
}

run();
