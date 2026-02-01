const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qqvvrffgxuyljictzfqh.supabase.co';
const SUPABASE_KEY = 'sb_secret_q4e1RT7kDGSveW1xyeF35w_vdTPi_Zm';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function run() {
    console.log("--- MIGRACIÓN DE DATOS (CONFIG -> SQL) ---");
    const orgId = '70e8610d-2c9b-403f-bfd2-21a279251b1b';

    // 1. Verify if tables exist
    const { error: tableCheck } = await supabase.from('opening_hours').select('id').limit(1);
    if (tableCheck && tableCheck.code === '42P01') { // Undefined table
        console.error("\n🛑 ALERTA: Las tablas nuevas NO existen.");
        console.error("   Por favor ejecuta el archivo SQL 'supabase/migrations/20240204000000_relational_schedules_rules.sql' en el dashboard de Supabase.");
        return;
    }

    // 2. Fetch JSON Config
    const { data: ent } = await supabase.from('entities').select('details').eq('id', orgId).single();
    const details = ent?.details || {};

    // 3. Migrate Schedules -> opening_hours
    if (details.schedules) {
        console.log("Migrando Horarios...");
        const dayMap = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };

        for (const [dayName, schedList] of Object.entries(details.schedules)) {
            const dayNum = dayMap[dayName.toLowerCase()];
            if (dayNum !== undefined && schedList && schedList.length > 0) {
                const rule = schedList[0]; // Take first rule
                if (rule.isActive) {
                    const { error: insErr } = await supabase.from('opening_hours').insert({
                        entity_id: orgId,
                        day_of_week: dayNum,
                        open_time: rule.open,
                        close_time: rule.close
                    });
                    if (insErr) console.error(`Error inserting ${dayName}:`, insErr.message);
                    else console.log(` - ${dayName}: ${rule.open} - ${rule.close}`);
                }
            }
        }
    }

    // 4. Migrate Booking Rules -> Columns
    if (details.bookingRules) {
        console.log("Migrando Reglas de Reserva...");
        const br = details.bookingRules;
        const { error: upErr } = await supabase.from('entities').update({
            default_duration: br.defaultDuration || 90,
            advance_booking_days: br.advanceBookingDays || 14,
            cancellation_window: br.cancellationWindow || 4
        }).eq('id', orgId);

        if (upErr) console.error("Error updating entities:", upErr.message);
        else console.log(" - Columnas actualizadas en entities.");
    }

    console.log("Proceso terminado.");
}

run();
